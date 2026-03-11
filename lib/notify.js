// lib/notify.js
import mongoose from "mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { sendAppEmail } from "@/lib/email";
import { buildNotificationEmail } from "@/lib/emailTemplates";

/* =========================
   Kind helpers
   ========================= */
function getTxnKind(txn) {
  const k = String(txn?.kind || "").toUpperCase();
  const pt = String(txn?.product?.type || "").toLowerCase();

  if (k === "DONATION" || pt === "donation") return "DONATION";
  if (k === "AUCTION" || pt === "auction") return "AUCTION";
  return "BUY_SELL";
}

function isPaidFlow(txn) {
  const kind = getTxnKind(txn);
  return kind === "BUY_SELL" || kind === "AUCTION";
}

/* =========================
   Link resolver
   ========================= */
function ordersListLink({ role, kind }) {
  return `/my-orders?role=${role}&status=ALL&kind=${kind}`;
}

function linkFor({ type, flags, txn }) {
  const { isAdmin, isBuyer, isSeller } = flags;
  const upType = String(type || "").toUpperCase();
  const kind = getTxnKind(txn);
  const status = String(txn?.status || "").toUpperCase();

  // Admin-only view
  if (isAdmin && !(isBuyer || isSeller)) return "/admin/transactions";

  // Admin who is also a party
  if (
    isAdmin &&
    (isBuyer || isSeller) &&
    (kind === "BUY_SELL" || kind === "AUCTION")
  ) {
    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      upType === "ADMIN_REFUNDED_BUYER" ||
      upType === "ADMIN_PAID_OUT" ||
      upType === "ADMIN_STATUS_OVERRIDE" ||
      // NEW: cancellation after payment -> admin must handle refund
      ((upType === "CANCELLED_BY_BUYER" || upType === "CANCELLED_BY_SELLER") &&
        txn?.hasPaymentSucceeded)
    ) {
      return "/admin/transactions";
    }
  }

  if (isBuyer) {
    // buyer must act from list page for pending payment
    if (status === "PENDING_PAYMENT" || status === "AWAITING_DONOR") {
      return ordersListLink({ role: "buyer", kind });
    }

    if (upType === "ADMIN_REFUNDED_BUYER") {
      return `/my-orders/${txn._id}/refund`;
    }

    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      upType === "ADMIN_PAID_OUT"
    ) {
      return `/review/${txn._id}`;
    }

    return `/my-orders/${txn._id}`;
  }

  if (isSeller) {
    // donor must act from list page for awaiting donor
    if (status === "PENDING_PAYMENT" || status === "AWAITING_DONOR") {
      return ordersListLink({ role: "seller", kind });
    }

    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      upType === "ADMIN_PAID_OUT"
    ) {
      return `/my-orders/${txn._id}/payout`;
    }

    return `/my-orders/${txn._id}`;
  }

  return `/my-orders/${txn._id}`;
}

/* =========================
   Names helper
   ========================= */
function namesFor(txn) {
  const product = txn.product?.title || "Unknown product";
  const buyer =
    txn.buyer?.name || txn.buyer?.email || txn.buyer?.toString?.() || "Buyer";
  const seller =
    txn.seller?.name ||
    txn.seller?.email ||
    txn.seller?.toString?.() ||
    "Seller";

  return { product, buyer, seller };
}

/* =========================
   Notification filter
   Controls WHICH recipient gets WHICH event
   ========================= */
function shouldNotifyRecipient({ type, txn, flags }) {
  const upType = String(type || "").toUpperCase();
  const kind = getTxnKind(txn);
  const paidFlow = isPaidFlow(txn);
  const { isBuyer, isSeller, isAdmin } = flags;

  // ---- NEVER notify for internal/accounting-only events
  if (["STRIPE_FEE_RECORDED"].includes(upType)) {
    return false;
  }

  // ---- ADMIN-ONLY rules (only when recipient is admin and NOT buyer/seller
  // User requirement:
  // Admin mainly needs:
  // 1) buyer confirmed
  // 2) paid-success txn later becomes buyer/seller cancelled => refund needed
  if (isAdmin && !isBuyer && !isSeller && paidFlow) {
    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS"
    ) {
      return true;
    }

    if (
      (upType === "CANCELLED_BY_BUYER" || upType === "CANCELLED_BY_SELLER") &&
      txn?.hasPaymentSucceeded
    ) {
      return true;
    }

    if (upType === "ADMIN_REFUNDED_BUYER" || upType === "ADMIN_PAID_OUT") {
      return true;
    }

    if (upType === "ADMIN_STATUS_OVERRIDE") {
      return true;
    }

    return false;
  }

  // ---- ADMIN-ONLY rules for donation
  if (isAdmin && !isBuyer && !isSeller && kind === "DONATION") {
    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      upType === "ADMIN_STATUS_OVERRIDE"
    ) {
      return true;
    }
    return false;
  }

  // ---- BUYER / SELLER rules
  // Keep current user-facing notifications for meaningful steps.
  if (isBuyer || isSeller) {
    return [
      "ORDER_CREATED",
      "DONATION_INSTANT_CREATED",
      "SELLER_ACCEPTED",
      "CHAT_STARTED",
      "SELLER_PROOF_UPLOADED",
      "BUYER_CONFIRMED",
      "AUTO_CONFIRMED_AFTER_3_DAYS",
      "AUTO_CANCELLED_EXPIRED",
      "CANCELLED_BY_BUYER",
      "CANCELLED_BY_SELLER",
      "ADMIN_REFUNDED_BUYER",
      "ADMIN_PAID_OUT",
      "ADMIN_STATUS_OVERRIDE",

      // payment / auction-specific
      "STRIPE_PAYMENT_CONFIRMED",
      "PAYMENT_FAILED",
      "AUCTION_WINNER_ASSIGNED",
      "AUCTION_WINNER_ASSIGNED_AUTO",
      "AUCTION_WINNER_ADVANCED",
      "AUCTION_UNSUCCESSFUL",
      "AUCTION_UNSUCCESSFUL_NO_BIDS",
      "AUCTION_ALL_BIDDERS_FAILED",
    ].includes(upType);
  }

  return false;
}

function shouldEmailRecipient({ type, txn, flags }) {
  const upType = String(type || "").toUpperCase();
  const kind = getTxnKind(txn);
  const paidFlow = isPaidFlow(txn);
  const { isBuyer, isSeller, isAdmin } = flags;

  // No email for donation for now
  if (kind === "DONATION") return false;

  // Admin important operational emails only
  if (isAdmin && !isBuyer && !isSeller) {
    if (
      upType === "BUYER_CONFIRMED" ||
      upType === "AUTO_CONFIRMED_AFTER_3_DAYS"
    ) {
      return true;
    }

    if (
      (upType === "CANCELLED_BY_BUYER" || upType === "CANCELLED_BY_SELLER") &&
      paidFlow &&
      txn?.hasPaymentSucceeded
    ) {
      return true;
    }

    if (upType === "ADMIN_REFUNDED_BUYER" || upType === "ADMIN_PAID_OUT") {
      return true;
    }

    return false;
  }

  // Buyer email rules
  if (isBuyer) {
    return [
      "AUTO_CANCELLED_EXPIRED",
      "PAYMENT_FAILED",
      "AUCTION_WINNER_ASSIGNED",
      "AUCTION_WINNER_ASSIGNED_AUTO",
      "AUCTION_WINNER_ADVANCED",
      "SELLER_PROOF_UPLOADED",
      "ADMIN_PAID_OUT",
      "CANCELLED_BY_SELLER",
      "ADMIN_REFUNDED_BUYER",
    ].includes(upType);
  }

  // Seller email rules
  if (isSeller) {
    return [
      "AUTO_CANCELLED_EXPIRED",
      "STRIPE_PAYMENT_CONFIRMED",
      "PAYMENT_FAILED",
      "BUYER_CONFIRMED",
      "AUTO_CONFIRMED_AFTER_3_DAYS",
      "CANCELLED_BY_BUYER",
      "ADMIN_PAID_OUT",
      "AUCTION_WINNER_ASSIGNED",
      "AUCTION_WINNER_ASSIGNED_AUTO",
      "AUCTION_WINNER_ADVANCED",
      "AUCTION_UNSUCCESSFUL",
      "AUCTION_UNSUCCESSFUL_NO_BIDS",
      "AUCTION_ALL_BIDDERS_FAILED",
    ].includes(upType);
  }

  return false;
}

/* =========================
   Text builder
   Return null for events that should not create notification text
   ========================= */
function textFor({ type, txn, flags }) {
  const { product } = namesFor(txn);
  const { isBuyer, isSeller, isAdmin } = flags;
  const upType = String(type || "").toUpperCase();
  const kind = getTxnKind(txn);

  const overrideStatus =
    upType === "ADMIN_STATUS_OVERRIDE"
      ? String(txn?.timeline?.[txn.timeline.length - 1]?.meta?.status || "")
          .trim()
          .toUpperCase()
      : "";

  /* ---------- DONATION ---------- */
  if (kind === "DONATION") {
    switch (upType) {
      case "DONATION_INSTANT_CREATED":
        if (isBuyer) {
          return {
            title: "Request submitted",
            message: `You requested “${product}”. The donor will review your request.`,
          };
        }
        if (isSeller) {
          return {
            title: "New donation request",
            message: `You received a request for “${product}”.`,
          };
        }
        return null;

      case "SELLER_ACCEPTED":
        if (isSeller) {
          return {
            title: "Request accepted",
            message: `You accepted the request for “${product}”.`,
          };
        }
        if (isBuyer) {
          return {
            title: "Donor accepted",
            message: `Your request for “${product}” was accepted.`,
          };
        }
        return null;

      case "CHAT_STARTED":
        return {
          title: "Chat started",
          message: `Chat started for “${product}”. Chat and coordinate the hand-off.`,
        };

      case "SELLER_PROOF_UPLOADED":
        if (isBuyer) {
          return {
            title: "Delivery proof uploaded",
            message: `Donor uploaded proof for “${product}”. Please confirm when you receive it.`,
          };
        }
        if (isSeller) {
          return {
            title: "Proof uploaded",
            message: `You uploaded proof for “${product}”. Waiting for recipient confirmation.`,
          };
        }
        return null;

      case "BUYER_CONFIRMED":
        if (isBuyer) {
          return {
            title: "Received confirmed",
            message: `You confirmed you received “${product}”. Please consider leaving a review to thank the donor for their generosity. Thank you for being part of the TrustLoop community.`,
          };
        }
        if (isSeller) {
          return {
            title: "Recipient confirmed",
            message: `Recipient confirmed receiving “${product}”. Please consider leaving a review for the recipient to share your experience. Thank you for supporting the TrustLoop community.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Recipient confirmed",
            message: `Recipient confirmed receiving “${product}”. Donation is complete.`,
          };
        }
        return null;

      case "AUTO_CONFIRMED_AFTER_3_DAYS":
        if (isBuyer || isSeller || isAdmin) {
          return {
            title: "Auto-confirmed",
            message: `“${product}” was auto-confirmed as received. Donation is complete. Thank you for being part of the TrustLoop community.`,
          };
        }
        return null;

      case "CANCELLED_BY_BUYER":
        if (isBuyer) {
          return {
            title: "Request cancelled",
            message: `You cancelled the request for “${product}”.`,
          };
        }
        if (isSeller) {
          return {
            title: "Request cancelled",
            message: `Recipient cancelled the request for “${product}”.`,
          };
        }
        return null;

      case "CANCELLED_BY_SELLER":
        if (isBuyer) {
          return {
            title: "Request cancelled",
            message: `Donor cancelled the request for “${product}”.`,
          };
        }
        if (isSeller) {
          return {
            title: "Request cancelled",
            message: `You cancelled the request for “${product}”.`,
          };
        }
        return null;

      case "ADMIN_STATUS_OVERRIDE":
        if (isBuyer || isSeller) {
          return {
            title: "Status updated by admin",
            message: overrideStatus
              ? `Admin changed “${product}” status → ${overrideStatus}.`
              : `Admin updated the status for “${product}”.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Status override",
            message: overrideStatus
              ? `You changed “${product}” status → ${overrideStatus}.`
              : `You updated the status for “${product}”.`,
          };
        }
        return null;

      default:
        return null;
    }
  }

  /* ---------- AUCTION ---------- */
  if (kind === "AUCTION") {
    switch (upType) {
      case "AUCTION_WINNER_ASSIGNED":
        if (isBuyer) {
          return {
            title: "You are the winning bidder",
            message: `You were selected as the winner for “${product}”. Please complete payment within the time limit.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner selected",
            message: `You selected a winning bidder for “${product}”. Waiting for payment.`,
          };
        }
        return null;

      case "AUCTION_WINNER_ASSIGNED_AUTO":
        if (isBuyer) {
          return {
            title: "You won the auction",
            message: `The auction for “${product}” has ended and you were automatically selected as the winner. Please complete payment within the time limit.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner selected automatically",
            message: `The system automatically selected the winning bidder for “${product}”. Waiting for payment.`,
          };
        }
        return null;

      case "AUCTION_WINNER_ADVANCED":
        if (isBuyer) {
          return {
            title: "You are next in line",
            message: `The previous winner did not complete payment, and you are now selected to pay for “${product}”.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner moved to next bidder",
            message: `The previous winner did not pay in time. The auction for “${product}” has moved to the next eligible bidder.`,
          };
        }
        return null;

      // from here onward, auction uses same lifecycle as buy/sell
      case "STRIPE_PAYMENT_CONFIRMED":
        if (isBuyer) {
          return {
            title: "Payment successful",
            message: `Your payment for auction “${product}” was successful. You can proceed chatting for delivery/meetup.`,
          };
        }
        if (isSeller) {
          return {
            title: "Payment received",
            message: `The winner paid for “${product}”. You can proceed chatting for delivery/meetup.`,
          };
        }
        return null;

      case "PAYMENT_FAILED":
        if (isBuyer) {
          return {
            title: "Payment failed",
            message: `Your payment for auction “${product}” failed. Please try again before the deadline.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner payment failed",
            message: `The current winner's payment failed for “${product}”.`,
          };
        }
        return null;

      case "CHAT_STARTED":
        return {
          title: "Chat started",
          message: `Chat started for auction “${product}”. Chat and coordinate delivery or meetup.`,
        };

      case "SELLER_PROOF_UPLOADED":
        if (isBuyer) {
          return {
            title: "Delivery proof uploaded",
            message: `Seller uploaded proof for auction “${product}”. Please confirm when received.`,
          };
        }
        if (isSeller) {
          return {
            title: "Proof uploaded",
            message: `You uploaded proof for auction “${product}”. Waiting for winner confirmation.`,
          };
        }
        return null;

      case "BUYER_CONFIRMED":
        if (isBuyer) {
          return {
            title: "Received confirmed",
            message: `You confirmed receiving auction item “${product}”. Admin can release payout.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner confirmed received",
            message: `The winner confirmed receiving “${product}”. Waiting for admin payout.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Winner confirmed received",
            message: `The winner confirmed receiving “${product}”. You can release payout.`,
          };
        }
        return null;

      case "AUTO_CONFIRMED_AFTER_3_DAYS":
        if (isBuyer) {
          return {
            title: "Auto-confirmed received",
            message: `Auction item “${product}” was auto-confirmed as received.`,
          };
        }
        if (isSeller) {
          return {
            title: "Auto-confirmed received",
            message: `Auction item “${product}” was auto-confirmed as received. Waiting for admin payout.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Auto-confirmed received",
            message: `Auction item “${product}” was auto-confirmed as received. You can release payout.`,
          };
        }
        return null;

      case "AUTO_CANCELLED_EXPIRED":
        if (isBuyer) {
          return {
            title: "Payment expired",
            message: `Your payment window for auction “${product}” expired, so this auction win was cancelled.`,
          };
        }
        if (isSeller) {
          return {
            title: "Winner payment expired",
            message: `The winner did not pay in time for “${product}”. The auction may move to the next bidder if there is one.`,
          };
        }
        return null;

      case "CANCELLED_BY_BUYER":
        if (isBuyer) {
          return {
            title: "Order cancelled",
            message: `You cancelled the auction order for “${product}”.`,
          };
        }
        if (isSeller) {
          return {
            title: "Order cancelled",
            message: `Winner cancelled the auction order for “${product}”.`,
          };
        }
        if (isAdmin && txn?.hasPaymentSucceeded) {
          return {
            title: "Refund required",
            message: `Winner cancelled auction order “${product}” after payment. Refund may be required.`,
          };
        }
        return null;

      case "CANCELLED_BY_SELLER":
        if (isBuyer) {
          return {
            title: "Order cancelled",
            message: `Seller cancelled the auction order for “${product}”. Admin may need to refund you.`,
          };
        }
        if (isSeller) {
          return {
            title: "Order cancelled",
            message: `You cancelled the auction order for “${product}”.`,
          };
        }
        if (isAdmin && txn?.hasPaymentSucceeded) {
          return {
            title: "Refund required",
            message: `Seller cancelled auction order “${product}” after payment. Refund may be required.`,
          };
        }
        return null;

      case "ADMIN_REFUNDED_BUYER":
        if (isBuyer) {
          return {
            title: "Refunded",
            message: `Admin marked a refund for auction “${product}”.`,
          };
        }
        if (isSeller) {
          return {
            title: "Refund processed",
            message: `Admin refunded the winner for “${product}”.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Refund marked",
            message: `Refund marked for auction “${product}”.`,
          };
        }
        return null;

      case "ADMIN_PAID_OUT":
        if (isBuyer) {
          return {
            title: "Auction complete",
            message: `Payout was released for “${product}”. Please consider leaving a review for the seller to share your experience. Thank you for being part of the TrustLoop community.`,
          };
        }
        if (isSeller) {
          return {
            title: "Payout released",
            message: `Admin released your payout for “${product}”. Please consider leaving a review for the buyer to share your experience. Thank you for being part of the TrustLoop community.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Payout released",
            message: `Admin released payout for “${product}”. Order is complete.`,
          };
        }
        return null;

      case "AUCTION_UNSUCCESSFUL":
      case "AUCTION_UNSUCCESSFUL_NO_BIDS":
      case "AUCTION_ALL_BIDDERS_FAILED":
        if (isSeller) {
          return {
            title: "Auction ended without a sale",
            message: `Your auction “${product}” ended without a successful buyer.`,
          };
        }
        if (isBuyer) {
          return {
            title: "Auction closed",
            message: `Auction “${product}” closed without a successful purchase.`,
          };
        }
        return null;

      case "ADMIN_STATUS_OVERRIDE":
        if (isBuyer || isSeller) {
          return {
            title: "Status updated by admin",
            message: overrideStatus
              ? `Admin changed auction “${product}” status → ${overrideStatus}.`
              : `Admin updated the status for auction “${product}”.`,
          };
        }
        if (isAdmin) {
          return {
            title: "Status override",
            message: overrideStatus
              ? `You changed auction “${product}” status → ${overrideStatus}.`
              : `You updated the status for auction “${product}”.`,
          };
        }
        return null;

      default:
        return null;
    }
  }

  /* ---------- BUY & SELL ---------- */
  switch (upType) {
    case "ORDER_CREATED":
      if (isBuyer) {
        return {
          title: "Order created",
          message: `You placed an order for “${product}”. Complete payment within the time limit.`,
        };
      }
      if (isSeller) {
        return {
          title: "New order",
          message: `New order for “${product}”. Waiting for buyer payment.`,
        };
      }
      return null;

    case "STRIPE_PAYMENT_CONFIRMED":
      if (isBuyer) {
        return {
          title: "Payment successful",
          message: `Your payment for product “${product}” was successful. You can proceed chatting for delivery/meetup.`,
        };
      }
      if (isSeller) {
        return {
          title: "Payment received",
          message: `Buyer paid for “${product}”. You can proceed chatting for delivery/meetup.`,
        };
      }
      return null;

    case "PAYMENT_FAILED":
      if (isBuyer) {
        return {
          title: "Payment failed",
          message: `Payment failed for “${product}”. Please try again.`,
        };
      }
      if (isSeller) {
        return {
          title: "Payment failed",
          message: `Buyer payment failed for “${product}”.`,
        };
      }
      return null;

    case "CHAT_STARTED":
      return {
        title: "Chat started",
        message: `Chat started for “${product}”. Chat and coordinate delivery or meetup.`,
      };

    case "SELLER_PROOF_UPLOADED":
      if (isBuyer) {
        return {
          title: "Delivery proof uploaded",
          message: `Seller uploaded proof for “${product}”. Please confirm when received.`,
        };
      }
      if (isSeller) {
        return {
          title: "Proof uploaded",
          message: `You uploaded proof for “${product}”. Waiting for buyer confirmation.`,
        };
      }
      return null;

    case "BUYER_CONFIRMED":
      if (isBuyer) {
        return {
          title: "Received confirmed",
          message: `You confirmed receiving “${product}”. Admin can release payout.`,
        };
      }
      if (isSeller) {
        return {
          title: "Buyer confirmed received",
          message: `Buyer confirmed receiving “${product}”. Waiting for admin payout.`,
        };
      }
      if (isAdmin) {
        return {
          title: "Buyer confirmed received",
          message: `Buyer confirmed receiving “${product}”. You can release payout.`,
        };
      }
      return null;

    case "AUTO_CONFIRMED_AFTER_3_DAYS":
      if (isBuyer) {
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received.`,
        };
      }
      if (isSeller) {
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received. Waiting for admin payout.`,
        };
      }
      if (isAdmin) {
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received. You can release payout.`,
        };
      }
      return null;

    case "AUTO_CANCELLED_EXPIRED":
      if (isBuyer) {
        return {
          title: "Order expired",
          message: `Payment time expired for “${product}”. Order was cancelled.`,
        };
      }
      if (isSeller) {
        return {
          title: "Order expired",
          message: `Buyer did not pay in time for “${product}”. Listing is available again.`,
        };
      }
      return null;

    case "CANCELLED_BY_BUYER":
      if (isBuyer) {
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      }
      if (isSeller) {
        return {
          title: "Order cancelled",
          message: `Buyer cancelled the order for “${product}”.`,
        };
      }
      if (isAdmin && txn?.hasPaymentSucceeded) {
        return {
          title: "Refund required",
          message: `Buyer cancelled “${product}” after payment. Refund may be required.`,
        };
      }
      return null;

    case "CANCELLED_BY_SELLER":
      if (isBuyer) {
        return {
          title: "Order cancelled",
          message: `Seller cancelled the order for “${product}”. Admin may need to refund you.`,
        };
      }
      if (isSeller) {
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      }
      if (isAdmin && txn?.hasPaymentSucceeded) {
        return {
          title: "Refund required",
          message: `Seller cancelled “${product}” after payment. Refund may be required.`,
        };
      }
      return null;

    case "ADMIN_REFUNDED_BUYER":
      if (isBuyer) {
        return {
          title: "Refunded",
          message: `Admin marked refund for “${product}”.`,
        };
      }
      if (isSeller) {
        return {
          title: "Refund processed",
          message: `Admin refunded buyer for “${product}”.`,
        };
      }
      if (isAdmin) {
        return {
          title: "Refund marked",
          message: `Refund marked for “${product}”.`,
        };
      }
      return null;

    case "ADMIN_PAID_OUT":
      if (isBuyer) {
        return {
          title: "Order complete",
          message: `Payout released for “${product}”. Please consider leaving a review for the seller to share your experience. Thank you for being part of the TrustLoop community.`,
        };
      }
      if (isSeller) {
        return {
          title: "Payout released",
          message: `Admin released payout for “${product}”. Please consider leaving a review for the buyer to share your experience. Thank you for being part of the TrustLoop community.`,
        };
      }
      if (isAdmin) {
        return {
          title: "Payout released",
          message: `Admin released payout for “${product}”. Order is complete.`,
        };
      }
      return null;

    case "ADMIN_STATUS_OVERRIDE":
      if (isBuyer || isSeller) {
        return {
          title: "Status updated by admin",
          message: overrideStatus
            ? `Admin changed “${product}” status → ${overrideStatus}.`
            : `Admin updated status for “${product}”.`,
        };
      }
      if (isAdmin) {
        return {
          title: "Status override",
          message: overrideStatus
            ? `You changed “${product}” status → ${overrideStatus}.`
            : `You updated status for “${product}”.`,
        };
      }
      return null;

    default:
      return null;
  }
}

/* =========================
   Helpers
   ========================= */
function uniq(ids) {
  const s = new Set();
  return ids.filter((id) => {
    const k = String(id);
    if (!k || s.has(k)) return false;
    s.add(k);
    return true;
  });
}

function flagsForRecipient(rid, buyerId, sellerId, adminIds) {
  const r = String(rid);
  const isAdmin = adminIds.some((id) => String(id) === r);
  const isBuyer = String(buyerId) === r;
  const isSeller = String(sellerId) === r;
  return { isAdmin, isBuyer, isSeller };
}

/* =========================
   notifyTxnEvent
   ========================= */
export async function notifyTxnEvent({ txn, actorId, type }) {
  await txn.populate([
    { path: "buyer" },
    { path: "seller" },
    { path: "product" },
  ]);

  const admins = await User.find({ role: "admin" }).select("_id").lean();
  const adminIds = admins.map((a) => a._id);

  const buyerId = txn.buyer?._id || txn.buyer;
  const sellerId = txn.seller?._id || txn.seller;

  let recipients = [];
  if (buyerId) recipients.push(buyerId);
  if (sellerId) recipients.push(sellerId);
  recipients.push(...adminIds);
  recipients = uniq(recipients);

  if (recipients.length === 0) return;

  const { product, buyer, seller } = namesFor(txn);
  const now = new Date();

  for (const rid of recipients) {
    const flags = flagsForRecipient(rid, buyerId, sellerId, adminIds);

    if (!shouldNotifyRecipient({ type, txn, flags })) {
      continue;
    }

    const content = textFor({ type, txn, flags });
    if (!content) continue;

    const { title, message } = content;
    if (!title || !message) continue;

    const ridObj = new mongoose.Types.ObjectId(rid);

    const baseMeta = {
      productTitle: product,
      buyerName: buyer,
      sellerName: seller,
    };

    const latestSet = {
      actor: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      type,
      title,
      message,
      link: linkFor({ type, flags, txn }),
      meta: baseMeta,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    };

    try {
      const shouldEmail = shouldEmailRecipient({ type, txn, flags });
      const recipientUser = await User.findById(rid)
        .select("name email")
        .lean();

      if (shouldEmail && recipientUser?.email) {
        const emailPayload = buildNotificationEmail({
          recipientName: recipientUser.name || recipientUser.email,
          title,
          message,
          link: latestSet.link,
        });

        await sendAppEmail({
          to: recipientUser.email,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        });
      }
    } catch (err) {
      console.error("❌ Failed to send notification email:", err);
    }

    const eventEntry = {
      at: now,
      type,
      title,
      message,
      meta: baseMeta,
    };

    const existing = await Notification.findOne({
      recipient: ridObj,
      transaction: txn._id,
    }).select("_id isRead");

    if (!existing) {
      await Notification.updateOne(
        { recipient: ridObj, transaction: txn._id },
        {
          $setOnInsert: {
            recipient: ridObj,
            transaction: txn._id,
            product: txn.product?._id || txn.product,
            isRead: false,
            createdAt: now,
          },
          $set: latestSet,
          $push: { events: eventEntry },
        },
        { upsert: true },
      );

      await User.updateOne(
        { _id: ridObj },
        { $inc: { unreadNotifications: 1 } },
      );
    } else {
      const wasRead = !!existing.isRead;

      await Notification.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...latestSet,
            isRead: false,
          },
          $push: { events: eventEntry },
        },
      );

      if (wasRead) {
        await User.updateOne(
          { _id: ridObj },
          { $inc: { unreadNotifications: 1 } },
        );
      }
    }
  }
}
