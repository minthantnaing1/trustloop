export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

// GET /api/transactions/:id
export async function GET(_req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id))
    return new Response("Invalid id", { status: 400 });

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me) return new Response("User not found", { status: 404 });

  // include product so we can release it on expiry
  const txn = await Transaction.findById(id)
    .populate({ path: "product", select: "title images defaultImage price" })
    .populate({ path: "seller", select: "name email" })
    .populate({ path: "buyer", select: "name email" });

  if (!txn) return new Response("Not found", { status: 404 });

  const isParty =
    String(txn.buyer?._id) === String(me._id) ||
    String(txn.seller?._id) === String(me._id) ||
    me.role === "admin";
  if (!isParty) return new Response("Forbidden", { status: 403 });

  // Auto-cancel expired pending orders AND release product
  if (
    txn.status === "PENDING_UPLOAD" &&
    txn.expiresAt &&
    txn.expiresAt.getTime() <= Date.now()
  ) {
    // Treat unpaid expiry as buyer-side cancel
    txn.status = "CANCELLED_BY_BUYER";
    txn.updatedAt = new Date();
    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "AUTO_CANCELLED_EXPIRED",
      meta: { source: "pay_get" },
    });
    await txn.save();

    if (txn.product?._id) {
      await Product.updateOne(
        { _id: txn.product._id },
        { $set: { isAvailable: true } }
      );
    }
  }

  return Response.json(JSON.parse(JSON.stringify(txn)));
}

// PATCH /api/transactions/:id
export async function PATCH(req, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id))
    return new Response("Invalid id", { status: 400 });

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me) return new Response("User not found", { status: 404 });

  const txn = await Transaction.findById(id);
  if (!txn) return new Response("Not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  // ---- Buyer uploads receipt (Cloudinary URL only) ----
  if (action === "upload_receipt") {
    const { buyerReceiptUrl, buyerReceiptPublicId = "" } = body || {};
    if (!buyerReceiptUrl)
      return new Response("buyerReceiptUrl required", { status: 400 });

    const canUpload =
      String(txn.buyer) === String(me._id) || me.role === "admin";
    if (!canUpload) return new Response("Forbidden", { status: 403 });

    if (txn.expiresAt && txn.expiresAt.getTime() < Date.now()) {
      return new Response("Order expired", { status: 410 });
    }

    txn.buyerReceiptUrl = buyerReceiptUrl;
    if (buyerReceiptPublicId) txn.buyerReceiptPublicId = buyerReceiptPublicId;

    txn.status = "AWAITING_ADMIN_REVIEW";
    txn.timeline.push({
      by: me._id,
      action: "BUYER_UPLOADED_RECEIPT",
      meta: { url: buyerReceiptUrl },
    });

    await txn.save();
    return Response.json({ success: true, status: txn.status });
  }

  // ---- Cancel (buyer or admin) -> release the product ----
  if (action === "cancel") {
    const { reason = "cancelled" } = body || {};
    const isBuyer = String(txn.buyer) === String(me._id);
    const isAdmin = me.role === "admin";

    // must be buyer or admin
    if (!isBuyer && !isAdmin) return new Response("Forbidden", { status: 403 });

    // already terminal?
    if (
      [
        "PAID_OUT",
        "CANCELLED_BY_BUYER",
        "CANCELLED_BY_SELLER",
        "REJECTED_BY_ADMIN",
      ].includes(txn.status)
    ) {
      return new Response("Already finalized", { status: 409 });
    }

    // PRIORITIZE BUYER INTENT:
    // If the caller is the buyer (even if also an admin), treat as buyer-cancel.
    if (isBuyer) {
      txn.status = "CANCELLED_BY_BUYER";
      txn.cancelledBy = me._id;
      txn.cancelReason = reason;
      txn.timeline.push({
        by: me._id,
        action: "CANCELLED_BY_BUYER",
        meta: { reason },
      });
    } else if (isAdmin) {
      // Pure admin-triggered path (rare here; admin rejections should normally use the admin endpoint)
      txn.status = "REJECTED_BY_ADMIN";
      txn.adminRejectReason = reason;
      txn.timeline.push({
        by: me._id,
        action: "REJECTED_BY_ADMIN",
        meta: { reason },
      });
    }

    await txn.save();

    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller accepts after admin approved (ESCROW_FUNDED -> SELLER_ACCEPTED) ----
  if (action === "seller_accept") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (txn.status !== "ESCROW_FUNDED") {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "SELLER_ACCEPTED";
    txn.timeline.push({ by: me._id, action: "SELLER_ACCEPTED" });
    await txn.save();

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller cancels after admin approved (allow from funded/accepted/in-delivery) ----
  if (action === "seller_cancel") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (
      !["ESCROW_FUNDED", "SELLER_ACCEPTED", "DELIVERY_IN_PROGRESS"].includes(
        txn.status
      )
    ) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "CANCELLED_BY_SELLER";
    txn.cancelledBy = me._id;
    txn.timeline.push({ by: me._id, action: "CANCELLED_BY_SELLER" });
    await txn.save();

    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller sets delivery details (DELIVERY method) ----
  if (action === "seller_set_delivery") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (!["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    if (txn.fulfillment?.method !== "DELIVERY") {
      return new Response("Not a delivery order", { status: 409 });
    }

    const { scheduledAt, carrier = "", tracking = "", notes = "" } = body || {};
    if (!scheduledAt)
      return new Response("scheduledAt required", { status: 400 });

    const sched = new Date(scheduledAt);
    if (isNaN(sched.getTime()))
      return new Response("Invalid scheduledAt", { status: 400 });

    const max = new Date();
    max.setDate(max.getDate() + 7); // <= 7 days from now
    if (sched > max)
      return new Response("Schedule must be within 7 days", { status: 400 });

    txn.fulfillment = {
      ...(txn.fulfillment?.toObject?.() || txn.fulfillment || {}),
      scheduledAt: sched,
      carrier,
      tracking,
      notes,
    };

    txn.timeline.push({
      by: me._id,
      action: "SELLER_SET_DELIVERY",
      meta: { scheduledAt: sched, carrier, tracking },
    });
    await txn.save();
    return Response.json({
      success: true,
      status: txn.status,
      fulfillment: txn.fulfillment,
    });
  }

  // ---- Seller starts delivery (moves to DELIVERY_IN_PROGRESS) ----
  if (action === "mark_delivery_in_progress") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (!["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }
    if (txn.fulfillment?.method !== "DELIVERY") {
      return new Response("Not a delivery order", { status: 409 });
    }
    if (!txn.fulfillment?.scheduledAt) {
      return new Response("Set scheduledAt first", { status: 409 });
    }

    txn.status = "DELIVERY_IN_PROGRESS";
    txn.timeline.push({ by: me._id, action: "DELIVERY_STARTED" });
    await txn.save();
    return Response.json({ success: true, status: txn.status });
  }

  // ---- Propose meetup (either side) ----
  if (action === "propose_meetup") {
    const isParty =
      String(txn.buyer) === String(me._id) ||
      String(txn.seller) === String(me._id);
    if (!isParty) return new Response("Forbidden", { status: 403 });

    if (!["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }
    if (txn.fulfillment?.method !== "MEETUP") {
      return new Response("Not a meetup order", { status: 409 });
    }

    const { meetupLocation = "", meetupProposedAt } = body || {};
    if (!meetupLocation)
      return new Response("meetupLocation required", { status: 400 });
    const proposed = new Date(meetupProposedAt);
    if (isNaN(proposed.getTime()))
      return new Response("Invalid meetupProposedAt", { status: 400 });

    txn.fulfillment = {
      ...(txn.fulfillment?.toObject?.() || txn.fulfillment || {}),
      meetupLocation,
      meetupProposedAt: proposed,
      meetupProposedBy: me._id,
      meetupAgreedAt: undefined,
      meetupScheduledAt: undefined,
    };

    txn.timeline.push({
      by: me._id,
      action: "MEETUP_PROPOSED",
      meta: { meetupLocation, meetupProposedAt: proposed },
    });
    await txn.save();
    return Response.json({ success: true, fulfillment: txn.fulfillment });
  }

  // ---- Accept meetup (other side confirms) -> move to DELIVERY_IN_PROGRESS ----
  if (action === "accept_meetup") {
    const isBuyer = String(txn.buyer) === String(me._id);
    const isSeller = String(txn.seller) === String(me._id);
    if (!isBuyer && !isSeller)
      return new Response("Forbidden", { status: 403 });

    if (txn.fulfillment?.method !== "MEETUP") {
      return new Response("Not a meetup order", { status: 409 });
    }
    if (
      !txn.fulfillment?.meetupProposedAt ||
      !txn.fulfillment?.meetupLocation
    ) {
      return new Response("No meetup proposal to accept", { status: 409 });
    }
    // Optional: ensure the accepter is not the same as the proposer
    if (String(txn.fulfillment?.meetupProposedBy) === String(me._id)) {
      return new Response("Other party must accept", { status: 409 });
    }

    const agreed = new Date();
    txn.fulfillment.meetupAgreedAt = agreed;
    txn.fulfillment.meetupScheduledAt = txn.fulfillment.meetupProposedAt;
    txn.status = "DELIVERY_IN_PROGRESS";

    txn.timeline.push({ by: me._id, action: "MEETUP_ACCEPTED" });
    await txn.save();
    return Response.json({
      success: true,
      status: txn.status,
      fulfillment: txn.fulfillment,
    });
  }

  // ---- Optional: update common notes (either side) ----
  if (action === "update_notes") {
    const isParty =
      String(txn.buyer) === String(me._id) ||
      String(txn.seller) === String(me._id);
    if (!isParty) return new Response("Forbidden", { status: 403 });

    const { notes = "" } = body || {};
    txn.fulfillment = {
      ...(txn.fulfillment?.toObject?.() || txn.fulfillment || {}),
      notes,
    };
    txn.timeline.push({ by: me._id, action: "FULFILLMENT_NOTES_UPDATED" });
    await txn.save();
    return Response.json({ success: true, fulfillment: txn.fulfillment });
  }

  // ---- Seller marks "delivered" (DELIVERY flow) -> SELLER_DELIVERED ----
  if (action === "seller_mark_delivered") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (txn.fulfillment?.method !== "DELIVERY") {
      return new Response("Not a delivery order", { status: 409 });
    }
    if (!["DELIVERY_IN_PROGRESS"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "SELLER_DELIVERED";
    txn.timeline.push({ by: me._id, action: "SELLER_DELIVERED" });
    await txn.save();
    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller marks "meetup completed" (MEETUP flow) -> MEETUP_COMPLETED ----
  if (action === "mark_meetup_completed") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (txn.fulfillment?.method !== "MEETUP") {
      return new Response("Not a meetup order", { status: 409 });
    }
    if (!["DELIVERY_IN_PROGRESS"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "MEETUP_COMPLETED";
    txn.timeline.push({ by: me._id, action: "MEETUP_COMPLETED" });
    await txn.save();
    return Response.json({ success: true, status: txn.status });
  }

  // ---- Buyer confirms receipt -> BUYER_CONFIRMED ----
  if (action === "buyer_confirm") {
    const isBuyer = String(txn.buyer) === String(me._id);
    if (!isBuyer) return new Response("Forbidden", { status: 403 });

    if (!["SELLER_DELIVERED", "MEETUP_COMPLETED"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "BUYER_CONFIRMED";
    txn.timeline.push({ by: me._id, action: "BUYER_CONFIRMED" });
    await txn.save();
    return Response.json({ success: true, status: txn.status });
  }
}
