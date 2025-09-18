import mongoose from "mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";

/* =========================
   Link resolver (your rules unchanged)
   ========================= */
function linkFor({ type, flags, txn }) {
  const { isAdmin, isBuyer, isSeller } = flags;

  // Admin who is also a party: route to Admin page for these two steps
  if (isAdmin && (isBuyer || isSeller)) {
    if (type === "BUYER_UPLOADED_RECEIPT" || type === "BUYER_CONFIRMED") {
      return "/admin/transactions";
    }
    // else fall through to party rules
  }

  // Buyer rules
  if (isBuyer) {
    if (type === "PAYMENT_WINDOW_STARTED") return "/my-orders"; // list (no :id)
    return `/my-orders/${txn._id}`;
  }

  // Seller rules
  if (isSeller) {
    if (type === "ADMIN_VERIFIED_PAYMENT") {
      // Go straight to Seller tab, pre-filtered to Escrow Funded
      return "/my-orders?role=seller&status=ESCROW_FUNDED";
    }
    return `/my-orders/${txn._id}`;
  }

  // Pure admin (not buyer/seller on this txn)
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
   Role-specific text for ALL events (concise + next steps)
   ========================= */
function textFor({ type, txn, flags }) {
  const { product } = namesFor(txn);
  const { isBuyer, isSeller, isAdmin } = flags;

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
          message: `Your slip for “${product}” was rejected. Please re-upload a valid slip.`,
        };
      if (isSeller)
        return {
          title: "Payment rejected",
          message: `Slip for “${product}” was rejected. Wait for buyer to re-upload or order will cancel.`,
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
          message: `Seller cancelled the order for “${product}”.`,
        };
      if (isSeller)
        return {
          title: "Order cancelled",
          message: `You cancelled the order for “${product}”.`,
        };
      if (isAdmin)
        return {
          title: "Order cancelled",
          message: `Order for “${product}” was cancelled by seller.`,
        };
      break;

    case "SELLER_ACCEPTED":
      if (isSeller)
        return {
          title: "You accepted the order",
          message: `You accepted “${product}”. Set delivery details or propose a meetup.`,
        };
      if (isBuyer)
        return {
          title: "Seller accepted",
          message: `Seller accepted your order for “${product}”. Wait for delivery/meetup details.`,
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
          message: `Seller marked “${product}” delivered. Confirm receipt in My Orders.`,
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
          message: `Meetup proposed for “${product}”. Review and accept/decline the plan.`,
        };
      if (isSeller)
        return {
          title: "Meetup proposed",
          message: `Meetup proposed for “${product}”. Confirm time/place with buyer.`,
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
          message: `Meetup confirmed for “${product}”. Be on time and complete the trade.`,
        };
      if (isSeller)
        return {
          title: "Meetup accepted",
          message: `Meetup confirmed for “${product}”. Proceed as agreed.`,
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
          message: `Meetup finished for “${product}”. Confirm receipt.`,
        };
      if (isSeller)
        return {
          title: "Meetup completed",
          message: `You marked meetup complete for “${product}”. Wait for buyer confirmation.`,
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
          message: `You confirmed that you received the item, “${product}”. Admin will release payout to the seller.`,
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
          message: `Buyer did not pay for “${product}”. Listing is available again.`,
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
          message: `No action for 3 days. “${product}” auto-confirmed. Admin will release payout.`,
        };
      if (isSeller)
        return {
          title: "Order auto-confirmed",
          message: `“${product}” auto-confirmed. Wait for admin payout.`,
        };
      if (isAdmin)
        return {
          title: "Order auto-confirmed",
          message: `“${product}” auto-confirmed. Release payout.`,
        };
      break;

    case "ADMIN_PAID_OUT":
      if (isBuyer)
        return {
          title: "Payout released",
          message: `Order for “${product}” is complete. Thanks for using TrustLoop.`,
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

  const docs = recipients.map((rid) => {
    const flags = flagsForRecipient(rid, buyerId, sellerId, adminIds);
    const { title, message } = textFor({ type, txn, flags });

    return {
      recipient: new mongoose.Types.ObjectId(rid),
      actor: actorId ? new mongoose.Types.ObjectId(actorId) : undefined,
      transaction: txn._id,
      product: txn.product?._id || txn.product,
      type,
      title,
      message,
      link: linkFor({ type, flags, txn }),
      meta: {
        productTitle: product,
        buyerName: buyer,
        sellerName: seller,
      },
      isRead: false,
    };
  });

  await Notification.insertMany(docs);
  await User.updateMany(
    { _id: { $in: recipients } },
    { $inc: { unreadNotifications: 1 } }
  );
}
