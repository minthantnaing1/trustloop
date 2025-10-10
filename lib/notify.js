import mongoose from "mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";

/* =========================
   Link resolver (Buy&Sell unchanged; adds donation-aware routes)
   ========================= */
function linkFor({ type, flags, txn }) {
  const { isAdmin, isBuyer, isSeller } = flags;

  const kind =
    String(txn?.kind || "").toUpperCase() === "DONATION" ||
    String(txn?.product?.type || "").toLowerCase() === "donation"
      ? "DONATION"
      : "BUY_SELL";

  // Admin who is also a party: route to Admin page for these steps
  if (isAdmin && (isBuyer || isSeller)) {
    if (
      type === "BUYER_UPLOADED_RECEIPT" ||
      type === "BUYER_CONFIRMED" ||
      type === "AUTO_CONFIRMED_AFTER_3_DAYS"
    ) {
      return "/admin/transactions";
    }
    // else fall through to party rules
  }

  // Buyer/Recipient rules
  if (isBuyer) {
    if (
      type === "ORDER_CREATED" ||
      type === "PAYMENT_WINDOW_STARTED" ||
      type === "CANCELLED_BY_BUYER" ||
      type === "CANCELLED_BY_SELLER" ||
      type === "REJECTED_BY_ADMIN" ||
      type === "DONATION_INSTANT_CREATED"
    ) {
      // include kind so the tab pre-filters correctly
      return `/my-orders?role=buyer&status=ALL&kind=${kind}`;
    }
    if (
      type === "BUYER_CONFIRMED" ||
      type === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      type === "ADMIN_PAID_OUT"
    ) {
      // donation uses the same final review route
      return `/review/${txn._id}`;
    }
    return `/my-orders/${txn._id}`;
  }

  // Seller/Donor rules
  if (isSeller) {
    if (
      type === "ORDER_CREATED" ||
      type === "PAYMENT_WINDOW_STARTED" ||
      type === "CANCELLED_BY_BUYER" ||
      type === "CANCELLED_BY_SELLER" ||
      type === "REJECTED_BY_ADMIN"
    ) {
      return `/my-orders?role=seller&status=ALL&kind=${kind}`;
    }
    if (type === "ADMIN_VERIFIED_PAYMENT") {
      // Buy&Sell only; donation never hits this path
      return "/my-orders?role=seller&status=ESCROW_FUNDED&kind=BUY_SELL";
    }
    if (type === "DONATION_INSTANT_CREATED") {
      // Donation only; buy&sell never hits this path
      return "/my-orders?role=seller&status=AWAITING_DONOR&kind=DONATION";
    }
    if (
      type === "BUYER_CONFIRMED" ||
      type === "AUTO_CONFIRMED_AFTER_3_DAYS" ||
      type === "ADMIN_PAID_OUT"
    ) {
      // For donation, this is the donor summary page (same route used as payout view)
      return `/my-orders/${txn._id}/payout`;
    }
    return `/my-orders/${txn._id}`;
  }

  // Pure admin (not party)
  if (isAdmin) return "/admin/transactions";

  // Fallback
  return `/my-orders/${txn._id}`;
}

/* =========================
   Names helper (for header meta only)
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
   Role-specific text for ALL events
   (Donation handled first; Buy&Sell original logic follows unchanged)
   ========================= */
function textFor({ type, txn, flags }) {
  const { product } = namesFor(txn);
  const { isBuyer, isSeller, isAdmin } = flags;

  const isDonation =
    String(txn?.kind || "").toUpperCase() === "DONATION" ||
    String(txn?.product?.type || "").toLowerCase() === "donation";

  /* ---------- DONATION (recipient/donor wording) ---------- */
  if (isDonation) {
    switch (type) {
      case "DONATION_INSTANT_CREATED":
      case "ORDER_CREATED": // selective flows reuse ORDER_CREATED as “request created”
        if (isBuyer)
          return {
            title: "Request submitted",
            message: `You requested the donation “${product}”. The donor will review your request.`,
          };
        if (isSeller)
          return {
            title: "New donation request",
            message: `You received a request for “${product}”. Accept the request or propose a meetup.`,
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
            title: "You accepted the request",
            message: `You accepted the request for “${product}”. Propose a meetup to hand over the item.`,
          };
        if (isBuyer)
          return {
            title: "Donor accepted",
            message: `Your request for “${product}” was accepted. Coordinate a meetup with the donor.`,
          };
        if (isAdmin)
          return {
            title: "Donor accepted",
            message: `Donor accepted the request for “${product}”.`,
          };
        break;

      case "MEETUP_PROPOSED":
        if (isBuyer)
          return {
            title: "Meetup proposed",
            message: `A meetup was proposed for “${product}”. Review the plan and accept or suggest changes.`,
          };
        if (isSeller)
          return {
            title: "Meetup proposed",
            message: `A meetup was proposed for “${product}”. Review the plan and accept or suggest changes.`,
          };
        if (isAdmin)
          return {
            title: "Meetup proposed",
            message: `Meetup proposed for “${product}”.`,
          };
        break;

      case "MEETUP_ACCEPTED":
        if (isBuyer)
          return {
            title: "Meetup accepted",
            message: `Meetup confirmed for “${product}”. Please be on time.`,
          };
        if (isSeller)
          return {
            title: "Meetup accepted",
            message: `Meetup confirmed for “${product}”. Please be on time.`,
          };
        if (isAdmin)
          return {
            title: "Meetup accepted",
            message: `Meetup confirmed for “${product}”.`,
          };
        break;

      case "MEETUP_COMPLETED":
        if (isBuyer)
          return {
            title: "Meetup completed",
            message: `Donor completed the meetup for “${product}”. Please confirm you received the item.`,
          };
        if (isSeller)
          return {
            title: "Meetup completed",
            message: `You completed the meetup for “${product}”. Wait for recipient confirmation about receiving the item`,
          };
        if (isAdmin)
          return {
            title: "Meetup completed",
            message: `Meetup completed for “${product}”.`,
          };
        break;

      case "BUYER_CONFIRMED":
        if (isBuyer)
          return {
            title: "You received the item",
            message: `You confirmed you received “${product}”. Thank the donor and leave a review.`,
          };
        if (isSeller)
          return {
            title: "Recipient confirmed received",
            message: `Recipient confirmed they received “${product}”. You can view the summary and reviews.`,
          };
        if (isAdmin)
          return {
            title: "Recipient confirmed",
            message: `Recipient confirmed receipt for “${product}”.`,
          };
        break;

      case "CANCELLED_BY_SELLER":
        if (isBuyer)
          return {
            title: "Request cancelled",
            message: `The donor cancelled your request for “${product}”. You may request other donations.`,
          };
        if (isSeller)
          return {
            title: "You cancelled the request",
            message: `You cancelled the request for “${product}”.`,
          };
        if (isAdmin)
          return {
            title: "Request cancelled",
            message: `Donor cancelled the request for “${product}”.`,
          };
        break;

      case "CANCELLED_BY_BUYER":
        if (isBuyer)
          return {
            title: "Request cancelled",
            message: `You cancelled your request for “${product}”.`,
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

      default:
        return {
          title: "Donation update",
          message: `Update on “${product}”.`,
        };
    }
  }

  /* ---------- BUY & SELL (original behavior) ---------- */
  switch (type) {
    case "ORDER_CREATED":
      if (isBuyer)
        return {
          title: "Order created",
          message: `You placed an order for “${product}”. Continue to payment and upload your slip.`,
        };
      if (isSeller)
        return {
          title: "New order",
          message: `New order for “${product}”. Buyer will open a payment window and upload a slip.`,
        };
      if (isAdmin)
        return {
          title: "Order created",
          message: `New order created for “${product}”. No action needed yet.`,
        };
      break;

    case "PAYMENT_WINDOW_STARTED":
      if (isBuyer)
        return {
          title: "Payment window started",
          message: `You have 5 minutes to upload the payment slip for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Payment window started",
          message: `Buyer has 5 minutes to upload the slip for “${product}”. No action needed.`,
        };
      if (isAdmin)
        return {
          title: "Payment window",
          message: `Payment window opened for “${product}”. Await buyer’s slip.`,
        };
      break;

    case "BUYER_UPLOADED_RECEIPT":
      if (isBuyer)
        return {
          title: "Slip uploaded",
          message: `Your payment slip for “${product}” was submitted. Please wait for admin review.`,
        };
      if (isSeller)
        return {
          title: "Slip uploaded",
          message: `Buyer submitted a payment slip for “${product}”. Wait for admin decision.`,
        };
      if (isAdmin)
        return {
          title: "Slip to review",
          message: `Review and verify the payment slip for “${product}”.`,
        };
      break;

    case "ADMIN_VERIFIED_PAYMENT":
      if (isBuyer)
        return {
          title: "Payment verified",
          message: `Admin approved your payment for “${product}”. Wait for the seller to accept or cancel.`,
        };
      if (isSeller)
        return {
          title: "Payment verified",
          message: `Payment for “${product}” is verified. Accept the order or cancel from My Orders.`,
        };
      if (isAdmin)
        return {
          title: "Payment verified",
          message: `Payment approved for “${product}”. Await seller’s decision.`,
        };
      break;

    case "REJECTED_BY_ADMIN":
      if (isBuyer)
        return {
          title: "Payment rejected",
          message: `Your slip for “${product}” was rejected. Please upload a valid slip.`,
        };
      if (isSeller)
        return {
          title: "Payment rejected",
          message: `Buyer payment slip for “${product}” was rejected by Admin. Order will be cancelled.`,
        };
      if (isAdmin)
        return {
          title: "Payment rejected",
          message: `You rejected the slip for “${product}”. Monitor for buyer re-upload.`,
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
          message: `Buyer cancelled the order for “${product}”. Listing is available again.`,
        };
      if (isAdmin)
        return {
          title: "Order cancelled",
          message: `Order for “${product}” was cancelled by buyer.`,
        };
      break;

    case "CANCELLED_BY_SELLER":
      if (isBuyer)
        return {
          title: "Order cancelled",
          message: `Seller cancelled the order for “${product}”. Admin will transfer your money back`,
        };
      if (isSeller)
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Order cancelled",
          message: `Order for “${product}” was cancelled by seller. Please transfer money back to the `,
        };
      break;

    case "SELLER_ACCEPTED":
      if (isSeller)
        return {
          title: "You accepted the order",
          message: `You accepted “${product}”. Set delivery details or Propose a meetup.`,
        };
      if (isBuyer)
        return {
          title: "Seller accepted",
          message: `Seller accepted your order for “${product}”. Wait for delivery details set by seller or Propose a meetup.`,
        };
      if (isAdmin)
        return {
          title: "Seller accepted",
          message: `Seller accepted the order for “${product}”.`,
        };
      break;

    case "SELLER_SET_DELIVERY":
      if (isBuyer)
        return {
          title: "Delivery scheduled",
          message: `Seller set delivery details for “${product}”. Review and be available.`,
        };
      if (isSeller)
        return {
          title: "Delivery scheduled",
          message: `Delivery details saved for “${product}”. Proceed with hand-off.`,
        };
      if (isAdmin)
        return {
          title: "Delivery scheduled",
          message: `Delivery details set for “${product}”.`,
        };
      break;

    case "DELIVERY_STARTED":
      if (isBuyer)
        return {
          title: "Delivery started",
          message: `“${product}” is on the way. Please be ready to receive.`,
        };
      if (isSeller)
        return {
          title: "Delivery started",
          message: `You started delivery for “${product}”. Mark delivered when done.`,
        };
      if (isAdmin)
        return {
          title: "Delivery started",
          message: `Delivery started for “${product}”.`,
        };
      break;

    case "SELLER_DELIVERED":
      if (isBuyer)
        return {
          title: "Delivered",
          message: `Seller marked “${product}” delivered. Confirm that you received the item in Order Details.`,
        };
      if (isSeller)
        return {
          title: "Delivered",
          message: `You marked “${product}” delivered. Wait for buyer confirmation.`,
        };
      if (isAdmin)
        return {
          title: "Delivered",
          message: `Seller marked “${product}” delivered. Await buyer confirmation or auto-confirm.`,
        };
      break;

    case "MEETUP_PROPOSED":
      if (isBuyer)
        return {
          title: "Meetup proposed",
          message: `Meetup proposed for “${product}”. Review the plan and accept or suggest changes.`,
        };
      if (isSeller)
        return {
          title: "Meetup proposed",
          message: `Meetup proposed for “${product}”. Review the plan and accept or suggest changes.`,
        };
      if (isAdmin)
        return {
          title: "Meetup proposed",
          message: `Meetup was proposed for “${product}”.`,
        };
      break;

    case "MEETUP_ACCEPTED":
      if (isBuyer)
        return {
          title: "Meetup accepted",
          message: `Meetup confirmed for “${product}”. Please be on time and complete the trade.`,
        };
      if (isSeller)
        return {
          title: "Meetup accepted",
          message: `Meetup confirmed for “${product}”. Please be on time and complete the trade.`,
        };
      if (isAdmin)
        return {
          title: "Meetup accepted",
          message: `Meetup confirmed for “${product}”.`,
        };
      break;

    case "MEETUP_COMPLETED":
      if (isBuyer)
        return {
          title: "Meetup completed",
          message: `Meetup finished for “${product}”. Please confirm that you received the item.`,
        };
      if (isSeller)
        return {
          title: "Meetup completed",
          message: `You marked meetup complete for “${product}”. Wait for buyer confirmation about receiving the item.`,
        };
      if (isAdmin)
        return {
          title: "Meetup completed",
          message: `Meetup completed for “${product}”.`,
        };
      break;

    case "BUYER_CONFIRMED":
      if (isBuyer)
        return {
          title: "You received item",
          message: `You confirmed that you received the item, “${product}”. Admin will release payout. Please check or download the receipt and review the item.`,
        };
      if (isSeller)
        return {
          title: "Buyer confirmed received item",
          message: `Buyer confirmed that he received the item, “${product}”. Wait for admin payout.`,
        };
      if (isAdmin)
        return {
          title: "Buyer confirmed",
          message: `Buyer confirmed that he received the item, “${product}”. Proceed to release payout.`,
        };
      break;

    case "AUTO_CANCELLED_EXPIRED":
      if (isBuyer)
        return {
          title: "Order auto-cancelled",
          message: `Payment time expired for “${product}”. Order cancelled.`,
        };
      if (isSeller)
        return {
          title: "Order auto-cancelled",
          message: `Buyer did not pay for “${product}” within time limit. Listing is available again.`,
        };
      if (isAdmin)
        return {
          title: "Order auto-cancelled",
          message: `Payment window expired for “${product}”.`,
        };
      break;

    case "AUTO_CONFIRMED_AFTER_3_DAYS":
      if (isBuyer)
        return {
          title: "Order auto-confirmed",
          message: `No action for 3 days. “${product}” is automatically confirmed that buyer received the item. Admin will release payout. Please check or download the receipt and review the item.`,
        };
      if (isSeller)
        return {
          title: "Order auto-confirmed",
          message: `“${product}” is automatically confirmed that buyer received the item. Wait for admin payout.`,
        };
      if (isAdmin)
        return {
          title: "Order auto-confirmed",
          message: `“${product}” is automatically confirmed received. Release payout.`,
        };
      break;

    case "ADMIN_PAID_OUT":
      if (isBuyer)
        return {
          title: "Payout released",
          message: `Order for “${product}” is complete. Thanks for using TrustLoop. Please check or download the receipt and review the item if you haven't`,
        };
      if (isSeller)
        return {
          title: "Payout released",
          message: `Admin released payout for “${product}”. Check your Payout.`,
        };
      if (isAdmin)
        return {
          title: "Payout released",
          message: `Payout released for “${product}”. Order closed.`,
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
   notifyTxnEvent (send to ALL parties; text varies by role)
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

  // Build per-recipient upserts (1 doc per txn+recipient)
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

    // Prepare "latest" snapshot fields (exclude fields used in $setOnInsert)
    const latestSet = {
      actor: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      type,
      title,
      message,
      link: linkFor({ type, flags, txn }),
      meta: baseMeta,
      updatedAt: now,
      // ⛔ DO NOT PUT isRead HERE
    };

    const eventEntry = {
      at: now,
      type,
      title,
      message,
      meta: baseMeta,
    };

    // Check if (recipient, txn) doc exists
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
            isRead: false, // ✅ only here for inserts
            createdAt: now, // ok to set for upsert
          },
          $set: latestSet, // ✅ no isRead here
          $push: { events: eventEntry },
        },
        { upsert: true }
      );

      await User.updateOne(
        { _id: ridObj },
        { $inc: { unreadNotifications: 1 } }
      );
    } else {
      const wasRead = !!existing.isRead;

      await Notification.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...latestSet,
            isRead: false, // ✅ only here for updates
          },
          $push: { events: eventEntry },
        }
      );

      if (wasRead) {
        await User.updateOne(
          { _id: ridObj },
          { $inc: { unreadNotifications: 1 } }
        );
      }
    }
  }
}
