import mongoose from "mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";

/* =========================
   Link resolver (UPDATED to current system)
   ========================= */
function linkFor({ type, flags, txn }) {
  const { isAdmin, isBuyer, isSeller } = flags;

  const kind =
    String(txn?.kind || "").toUpperCase() === "DONATION" ||
    String(txn?.product?.type || "").toLowerCase() === "donation"
      ? "DONATION"
      : "BUY_SELL";

  // Admin: always go admin transactions page
  if (isAdmin && !(isBuyer || isSeller)) return "/admin/transactions";

  // Admin who is also a party: for BUY_SELL, still route to admin page for admin actions
  if (isAdmin && (isBuyer || isSeller) && kind === "BUY_SELL") {
    if (
      type === "ADMIN_STATUS_OVERRIDE" ||
      type === "ADMIN_REFUNDED_BUYER" ||
      type === "ADMIN_PAID_OUT"
    ) {
      return "/admin/transactions";
    }
  }

  // Buyer/Recipient
  if (isBuyer) {
    if (type === "ADMIN_PAID_OUT") return `/review/${txn._id}`;
    return `/my-orders/${txn._id}`;
  }

  // Seller/Donor
  if (isSeller) {
    if (type === "ADMIN_PAID_OUT" && kind === "BUY_SELL")
      return `/my-orders/${txn._id}/payout`;
    // donation can also use payout/summary page if you already have it
    if (type === "BUYER_CONFIRMED" || type === "AUTO_CONFIRMED_AFTER_3_DAYS")
      return `/my-orders/${txn._id}/payout`;
    return `/my-orders/${txn._id}`;
  }

  // Fallback
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
   Text builder (UPDATED)
   - Only events that exist now
   - Keep ADMIN_STATUS_OVERRIDE detail (status)
   ========================= */
function textFor({ type, txn, flags }) {
  const { product } = namesFor(txn);
  const { isBuyer, isSeller, isAdmin } = flags;

  const isDonation =
    String(txn?.kind || "").toUpperCase() === "DONATION" ||
    String(txn?.product?.type || "").toLowerCase() === "donation";

  const upType = String(type || "").toUpperCase();

  // helper: admin override status
  const overrideStatus =
    upType === "ADMIN_STATUS_OVERRIDE"
      ? String(txn?.timeline?.[txn.timeline.length - 1]?.meta?.status || "")
          .trim()
          .toUpperCase()
      : "";

  /* ---------- DONATION (recipient/donor wording, but ONLY current events) ---------- */
  if (isDonation) {
    switch (upType) {
      case "ORDER_CREATED":
        if (isBuyer)
          return {
            title: "Request submitted",
            message: `You requested “${product}”. The donor will review your request.`,
          };
        if (isSeller)
          return {
            title: "New donation request",
            message: `You received a request for “${product}”.`,
          };
        if (isAdmin)
          return {
            title: "Donation request created",
            message: `A donation request was created for “${product}”.`,
          };
        break;

      case "SELLER_ACCEPTED":
        if (isSeller)
          return {
            title: "Request accepted",
            message: `You accepted the request for “${product}”.`,
          };
        if (isBuyer)
          return {
            title: "Donor accepted",
            message: `Your request for “${product}” was accepted.`,
          };
        if (isAdmin)
          return {
            title: "Donor accepted",
            message: `Donor accepted the request for “${product}”.`,
          };
        break;

      case "CHAT_STARTED":
        if (isBuyer)
          return {
            title: "Chat started",
            message: `Chat started for “${product}”. Coordinate the hand-off.`,
          };
        if (isSeller)
          return {
            title: "Chat started",
            message: `Chat started for “${product}”. Coordinate the hand-off.`,
          };
        if (isAdmin)
          return {
            title: "Chat started",
            message: `Chat started for “${product}”.`,
          };
        break;

      case "SELLER_PROOF_UPLOADED":
        if (isBuyer)
          return {
            title: "Delivery proof uploaded",
            message: `Donor uploaded proof for “${product}”. Please confirm when you receive it.`,
          };
        if (isSeller)
          return {
            title: "Proof uploaded",
            message: `You uploaded proof for “${product}”. Waiting for recipient confirmation.`,
          };
        if (isAdmin)
          return {
            title: "Proof uploaded",
            message: `Proof uploaded for “${product}”.`,
          };
        break;

      case "BUYER_CONFIRMED":
        if (isBuyer)
          return {
            title: "Received confirmed",
            message: `You confirmed you received “${product}”.`,
          };
        if (isSeller)
          return {
            title: "Recipient confirmed",
            message: `Recipient confirmed receiving “${product}”.`,
          };
        if (isAdmin)
          return {
            title: "Recipient confirmed",
            message: `Recipient confirmed receiving “${product}”.`,
          };
        break;

      case "AUTO_CONFIRMED_AFTER_3_DAYS":
        if (isBuyer)
          return {
            title: "Auto-confirmed",
            message: `“${product}” was auto-confirmed as received.`,
          };
        if (isSeller)
          return {
            title: "Auto-confirmed",
            message: `“${product}” was auto-confirmed as received.`,
          };
        if (isAdmin)
          return {
            title: "Auto-confirmed",
            message: `“${product}” was auto-confirmed as received.`,
          };
        break;

      case "CANCELLED_BY_BUYER":
        if (isBuyer)
          return {
            title: "Request cancelled",
            message: `You cancelled the request for “${product}”.`,
          };
        if (isSeller)
          return {
            title: "Request cancelled",
            message: `Recipient cancelled the request for “${product}”.`,
          };
        if (isAdmin)
          return {
            title: "Request cancelled",
            message: `Recipient cancelled the request for “${product}”.`,
          };
        break;

      case "CANCELLED_BY_SELLER":
        if (isBuyer)
          return {
            title: "Request cancelled",
            message: `Donor cancelled the request for “${product}”.`,
          };
        if (isSeller)
          return {
            title: "Request cancelled",
            message: `You cancelled the request for “${product}”.`,
          };
        if (isAdmin)
          return {
            title: "Request cancelled",
            message: `Donor cancelled the request for “${product}”.`,
          };
        break;

      default:
        return {
          title: "Donation update",
          message: `Update on “${product}”.`,
        };
    }
  }

  /* ---------- BUY & SELL (current Stripe system only) ---------- */
  switch (upType) {
    case "ORDER_CREATED":
      if (isBuyer)
        return {
          title: "Order created",
          message: `You placed an order for “${product}”. Complete payment within the time limit.`,
        };
      if (isSeller)
        return {
          title: "New order",
          message: `New order for “${product}”. Waiting for buyer payment.`,
        };
      if (isAdmin)
        return {
          title: "Order created",
          message: `New order created for “${product}”.`,
        };
      break;

    case "STRIPE_PAYMENT_CONFIRMED":
      if (isBuyer)
        return {
          title: "Payment successful",
          message: `Stripe payment successful for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Payment received",
          message: `Buyer paid for “${product}”. You can accept the order.`,
        };
      if (isAdmin)
        return {
          title: "Payment successful",
          message: `Stripe payment successful for “${product}”.`,
        };
      break;

    case "PAYMENT_FAILED":
      if (isBuyer)
        return {
          title: "Payment failed",
          message: `Payment failed for “${product}”. Please try again.`,
        };
      if (isSeller)
        return {
          title: "Payment failed",
          message: `Buyer payment failed for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Payment failed",
          message: `Payment failed for “${product}”.`,
        };
      break;

    case "STRIPE_FEE_RECORDED":
      // Optional: keep it quiet (mostly internal). If you want, show only to admin.
      if (isAdmin)
        return {
          title: "Stripe fee recorded",
          message: `Stripe fee recorded for “${product}”.`,
        };
      // for buyer/seller, do nothing special -> generic
      return {
        title: "Order update",
        message: `Update on “${product}”.`,
      };

    case "SELLER_ACCEPTED":
      if (isSeller)
        return {
          title: "Order accepted",
          message: `You accepted “${product}”.`,
        };
      if (isBuyer)
        return {
          title: "Seller accepted",
          message: `Seller accepted your order for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Seller accepted",
          message: `Seller accepted the order for “${product}”.`,
        };
      break;

    case "CHAT_STARTED":
      if (isBuyer)
        return {
          title: "Chat started",
          message: `Chat started for “${product}”. Coordinate delivery/meetup.`,
        };
      if (isSeller)
        return {
          title: "Chat started",
          message: `Chat started for “${product}”. Coordinate delivery/meetup.`,
        };
      if (isAdmin)
        return {
          title: "Chat started",
          message: `Chat started for “${product}”.`,
        };
      break;

    case "SELLER_PROOF_UPLOADED":
      if (isBuyer)
        return {
          title: "Delivery proof uploaded",
          message: `Seller uploaded proof for “${product}”. Please confirm when received.`,
        };
      if (isSeller)
        return {
          title: "Proof uploaded",
          message: `You uploaded proof for “${product}”. Waiting for buyer confirmation.`,
        };
      if (isAdmin)
        return {
          title: "Proof uploaded",
          message: `Seller uploaded proof for “${product}”.`,
        };
      break;

    case "BUYER_CONFIRMED":
      if (isBuyer)
        return {
          title: "Received confirmed",
          message: `You confirmed receiving “${product}”. Admin can release payout.`,
        };
      if (isSeller)
        return {
          title: "Buyer confirmed received",
          message: `Buyer confirmed receiving “${product}”. Waiting for admin payout.`,
        };
      if (isAdmin)
        return {
          title: "Buyer confirmed received",
          message: `Buyer confirmed receiving “${product}”. You can release payout.`,
        };
      break;

    case "AUTO_CONFIRMED_AFTER_3_DAYS":
      if (isBuyer)
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received.`,
        };
      if (isSeller)
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received. Waiting for admin payout.`,
        };
      if (isAdmin)
        return {
          title: "Auto-confirmed received",
          message: `“${product}” was auto-confirmed as received. You can release payout.`,
        };
      break;

    case "AUTO_CANCELLED_EXPIRED":
      if (isBuyer)
        return {
          title: "Order expired",
          message: `Payment time expired for “${product}”. Order was cancelled.`,
        };
      if (isSeller)
        return {
          title: "Order expired",
          message: `Buyer didn’t pay in time for “${product}”. Listing is available again.`,
        };
      if (isAdmin)
        return {
          title: "Order expired",
          message: `Payment time expired for “${product}”.`,
        };
      break;

    case "CANCELLED_BY_BUYER":
      if (isBuyer)
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Order cancelled",
          message: `Buyer cancelled the order for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Order cancelled",
          message: `Buyer cancelled the order for “${product}”.`,
        };
      break;

    case "CANCELLED_BY_SELLER":
      if (isBuyer)
        return {
          title: "Order cancelled",
          message: `Seller cancelled the order for “${product}”. Admin may need to refund buyer.`,
        };
      if (isSeller)
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Order cancelled",
          message: `Seller cancelled the order for “${product}”. Refund may be required.`,
        };
      break;

    case "ADMIN_REFUNDED_BUYER":
      if (isBuyer)
        return {
          title: "Refunded",
          message: `Admin marked refund for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Refund processed",
          message: `Admin refunded buyer for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Refund marked",
          message: `Refund marked for “${product}”.`,
        };
      break;

    case "ADMIN_PAID_OUT":
      if (isBuyer)
        return {
          title: "Order complete",
          message: `Payout released for “${product}”. Please leave a review if you haven’t.`,
        };
      if (isSeller)
        return {
          title: "Payout released",
          message: `Admin released payout for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Payout released",
          message: `Payout released for “${product}”.`,
        };
      break;

    case "ADMIN_STATUS_OVERRIDE":
      if (isBuyer)
        return {
          title: "Status updated by admin",
          message: overrideStatus
            ? `Admin changed “${product}” status → ${overrideStatus}.`
            : `Admin updated status for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Status updated by admin",
          message: overrideStatus
            ? `Admin changed “${product}” status → ${overrideStatus}.`
            : `Admin updated status for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Status override",
          message: overrideStatus
            ? `You changed “${product}” status → ${overrideStatus}.`
            : `You updated status for “${product}”.`,
        };
      break;

    default:
      return {
        title: "Transaction update",
        message: `Update on “${product}”.`,
      };
  }
}

/* =========================
   Helpers
   ========================= */
function uniq(ids) {
  const s = new Set();
  return ids.filter((id) => {
    const k = String(id);
    if (s.has(k)) return false;
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
  // Ensure relationships are populated
  await txn.populate([
    { path: "buyer" },
    { path: "seller" },
    { path: "product" },
  ]);

  // Fetch all admins once
  const admins = await User.find({ role: "admin" }).select("_id").lean();
  const adminIds = admins.map((a) => a._id);

  const buyerId = txn.buyer?._id || txn.buyer;
  const sellerId = txn.seller?._id || txn.seller;

  // Always send to buyer, seller, and all admins
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
    const { title, message } = textFor({ type, txn, flags });

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
    };

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
