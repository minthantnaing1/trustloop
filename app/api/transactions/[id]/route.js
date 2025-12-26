// app/api/transactions/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";
import { notifyTxnEvent } from "@/lib/notify";

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
  let txn = await Transaction.findById(id)
    .populate({
      path: "product",
      select: "title images defaultImage price category condition description",
    })
    .populate({
      path: "seller",
      // add defaultScanCode (+ bank fields if you need them)
      select:
        "name email phone defaultScanCode bankAccountName bankAccountNumber",
    })
    .populate({
      path: "buyer",
      select:
        "name email phone defaultScanCode bankAccountName bankAccountNumber",
    });

  if (!txn) return new Response("Not found", { status: 404 });

  const isParty =
    String(txn.buyer?._id) === String(me._id) ||
    String(txn.seller?._id) === String(me._id) ||
    me.role === "admin";
  if (!isParty) return new Response("Forbidden", { status: 403 });

  // --- Auto-cancel expired unpaid orders (atomic) & release product
  if (
    txn.status === "PENDING_PAYMENT" &&
    txn.expiresAt &&
    txn.expiresAt.getTime() <= Date.now()
  ) {
    const now = new Date();

    const upd = await Transaction.updateOne(
      { _id: txn._id, status: "PENDING_PAYMENT" }, // guard against races
      {
        $set: {
          status: "CANCELLED_BY_BUYER",
          cancelReason: "timeout",
          updatedAt: now,
        },
        $push: {
          timeline: {
            at: now,
            by: me._id,
            action: "AUTO_CANCELLED_EXPIRED",
            meta: { source: "pay_get" },
          },
        },
      }
    );

    if (upd.modifiedCount > 0 && txn.product?._id) {
      await Product.updateOne(
        { _id: txn.product._id },
        { $set: { isAvailable: true } }
      );

      // Re-fetch to return the updated doc
      txn = await Transaction.findById(id)
        .populate({
          path: "product",
          select:
            "title images defaultImage price category condition description",
        })
        .populate({
          path: "seller",
          select:
            "name email phone defaultScanCode bankAccountName bankAccountNumber",
        })
        .populate({
          path: "buyer",
          select:
            "name email phone defaultScanCode bankAccountName bankAccountNumber",
        });

      // AFTER re-fetching txn (right before leaving that block)
      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "AUTO_CANCELLED_EXPIRED",
      });
    }
  }

  // --- Auto-confirm after seller delivered / meetup completed (3 days)
  if (
    ["SELLER_DELIVERED", "MEETUP_COMPLETED"].includes(txn.status) &&
    txn.autoConfirmAt &&
    txn.autoConfirmAt.getTime() <= Date.now()
  ) {
    const now = new Date();

    // Atomic: only one request will succeed
    const upd = await Transaction.updateOne(
      {
        _id: txn._id,
        status: { $in: ["SELLER_DELIVERED", "MEETUP_COMPLETED"] },
        autoConfirmAt: { $lte: now },
      },
      {
        $set: {
          status: "BUYER_CONFIRMED",
          updatedAt: now,
          autoConfirmAt: null,
        },
        $push: {
          timeline: {
            at: now,
            by: me._id, // or a system user id
            action: "AUTO_CONFIRMED_AFTER_3_DAYS",
            meta: { source: "get_auto_confirm" },
          },
        },
      }
    );

    if (upd.modifiedCount > 0) {
      // mirror buyer_confirm expenses update once
      await User.updateOne(
        { _id: txn.buyer },
        { $inc: { expenses: Number(txn.total || 0) } }
      );

      // re-fetch for response/notifications
      txn = await Transaction.findById(id)
        .populate({
          path: "product",
          select:
            "title images defaultImage price category condition description",
        })
        .populate({
          path: "seller",
          select:
            "name email phone defaultScanCode bankAccountName bankAccountNumber",
        })
        .populate({
          path: "buyer",
          select:
            "name email phone defaultScanCode bankAccountName bankAccountNumber",
        });

      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "AUTO_CONFIRMED_AFTER_3_DAYS",
      });
    }
  }

  // normalize phone into one field
  const pickPhone = (u) =>
    u?.phone ||
    u?.phoneNumber ||
    u?.mobile ||
    u?.tel ||
    u?.contact?.phone ||
    "";

  const out = JSON.parse(JSON.stringify(txn));
  if (out?.buyer) out.buyer.phone = pickPhone(out.buyer);
  if (out?.seller) out.seller.phone = pickPhone(out.seller);

  return Response.json(out);
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

  // ⛔ Expiry guard: flip & exit if already expired
  if (
    txn.status === "PENDING_PAYMENT" &&
    txn.expiresAt &&
    txn.expiresAt.getTime() <= Date.now()
  ) {
    const now = new Date();
    const upd = await Transaction.updateOne(
      { _id: txn._id, status: "PENDING_PAYMENT" },
      {
        $set: {
          status: "CANCELLED_BY_BUYER",
          cancelReason: "timeout",
          updatedAt: now,
        },
        $push: {
          timeline: {
            at: now,
            by: me._id,
            action: "AUTO_CANCELLED_EXPIRED",
            meta: { source: "txn_patch" },
          },
        },
      }
    );

    if (upd.modifiedCount > 0 && txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }
    return new Response("Order expired", { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (action === "start_payment_window") {
    if (txn.status !== "PENDING_PAYMENT") {
      return new Response("Invalid state", { status: 400 });
    }
    if (!txn.expiresAt) {
      txn.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      txn.timeline.push({
        at: new Date(),
        by: me._id,
        action: "PAYMENT_WINDOW_STARTED",
        meta: { minutes: 5 },
      });
      await txn.save();
      // RIGHT AFTER await txn.save();
      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "PAYMENT_WINDOW_STARTED",
      });
    }
    return new Response(JSON.stringify({ expiresAt: txn.expiresAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
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
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type:
        txn.status === "CANCELLED_BY_BUYER"
          ? "CANCELLED_BY_BUYER"
          : "REJECTED_BY_ADMIN",
    });

    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }

    return Response.json({ success: true, status: txn.status });
  }

  if (action === "start_chat") {
    if (txn.kind === "BUY_SELL" && txn.status === "PAYMENT_SUCCESSFUL") {
      txn.status = "DELIVERY_IN_PROGRESS";
      txn.timeline.push({ by: me._id, action: "CHAT_STARTED" });
      await txn.save();
    }
    return Response.json({ success: true });
  }

  // ---- Seller accepts after admin approved (ESCROW_FUNDED -> SELLER_ACCEPTED) ----
  if (action === "seller_accept") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (!["PAYMENT_SUCCESSFUL", "AWAITING_DONOR"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "SELLER_ACCEPTED";
    txn.timeline.push({ by: me._id, action: "SELLER_ACCEPTED" });
    await txn.save();
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "SELLER_ACCEPTED",
    });

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller cancels after admin approved (allow from funded/accepted/in-delivery) ----
  if (action === "seller_cancel") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (
      ![
        "AWAITING_DONOR",
        "PAYMENT_SUCCESSFUL",
        "SELLER_ACCEPTED",
        "DELIVERY_IN_PROGRESS",
      ].includes(txn.status)
    ) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    // ⬇️ pull reason from the already-parsed body (or re-parse if needed)
    // If you already did: const body = await req.json(); above, this will work.
    const { cancelReason = "" } = body || {};
    const reason = String(cancelReason).trim().slice(0, 300);

    if (!reason) {
      return new Response("Cancellation reason is required.", { status: 400 });
    }

    txn.status = "CANCELLED_BY_SELLER";
    txn.cancelledBy = me._id;
    txn.cancelReason = reason; // ⬅️ persist reason
    txn.timeline.push({
      by: me._id,
      at: new Date(),
      action: "CANCELLED_BY_SELLER",
      meta: { reason }, // ⬅️ show it in timeline
    });

    await txn.save();
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "CANCELLED_BY_SELLER",
    });

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

    if (!["PAYMENT_SUCCESSFUL", "SELLER_ACCEPTED"].includes(txn.status)) {
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

    // Window: from now up to 10 days
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 10);
    if (sched < now)
      return new Response("Schedule cannot be in the past", { status: 400 });
    if (sched > max)
      return new Response("Schedule must be within 10 days", { status: 400 });

    // Optional but recommended: enforce max 3 edits on server (mirrors UI)
    const editCount =
      (txn.timeline || []).filter(
        (e) =>
          String(e?.by || "") === String(me._id) &&
          String(e?.action || "").toUpperCase() === "SELLER_SET_DELIVERY"
      ).length || 0;
    if (editCount >= 3)
      return new Response("Edit limit reached (3)", { status: 409 });

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
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "SELLER_SET_DELIVERY",
    });

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

    if (!["PAYMENT_SUCCESSFUL", "SELLER_ACCEPTED"].includes(txn.status)) {
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
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "DELIVERY_STARTED",
    });

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Propose meetup (either side) ----
  if (action === "propose_meetup") {
    const isParty =
      String(txn.buyer) === String(me._id) ||
      String(txn.seller) === String(me._id);
    if (!isParty) return new Response("Forbidden", { status: 403 });

    if (
      !["PAYMENT_SUCCESSFUL", "AWAITING_DONOR", "SELLER_ACCEPTED"].includes(
        txn.status
      )
    ) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    if (txn.fulfillment?.method !== "MEETUP") {
      return new Response("Not a meetup order", { status: 409 });
    }

    // Prevent same person from proposing again while there's an open proposal
    if (
      txn.fulfillment?.meetupProposedAt &&
      String(txn.fulfillment?.meetupProposedBy || "") === String(me._id)
    ) {
      return new Response("Other party must accept or counter", {
        status: 409,
      });
    }

    const { meetupLocation = "", meetupProposedAt } = body || {};
    if (!meetupLocation)
      return new Response("meetupLocation required", { status: 400 });

    const proposed = new Date(meetupProposedAt);
    if (isNaN(proposed.getTime()))
      return new Response("Invalid meetupProposedAt", { status: 400 });

    // Window: from now up to 10 days
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 10);
    if (proposed < now)
      return new Response("Proposed time cannot be in the past", {
        status: 400,
      });
    if (proposed > max)
      return new Response("Proposed time must be within 10 days", {
        status: 400,
      });

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
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "MEETUP_PROPOSED",
    });

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

    // ✅ Allow accept only if current status is valid
    if (
      !["PAYMENT_SUCCESSFUL", "AWAITING_DONOR", "SELLER_ACCEPTED"].includes(
        txn.status
      )
    ) {
      return new Response("Not allowed in current state", { status: 409 });
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
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "MEETUP_ACCEPTED",
    });

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

    // ⛔ new: must not be before scheduledAt
    const sched = txn.fulfillment?.scheduledAt
      ? new Date(txn.fulfillment.scheduledAt).getTime()
      : NaN;
    if (!Number.isFinite(sched)) {
      return new Response("scheduledAt is missing", { status: 409 });
    }
    if (Date.now() < sched) {
      return new Response("Too early to mark delivered", { status: 409 });
    }

    txn.status = "SELLER_DELIVERED";
    //txn.autoConfirmAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 days
    txn.autoConfirmAt = new Date(Date.now() + 1.5 * 60 * 1000); // +90 seconds
    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "SELLER_DELIVERED",
      meta: { autoConfirmAt: txn.autoConfirmAt },
    });
    await txn.save();
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "SELLER_DELIVERED",
    });

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

    // ⛔ new: must not be before agreed/scheduled meetup time
    const scheduled =
      txn.fulfillment?.meetupScheduledAt || txn.fulfillment?.meetupProposedAt;
    const meetTs = scheduled ? new Date(scheduled).getTime() : NaN;
    if (!Number.isFinite(meetTs)) {
      return new Response("Meetup time is missing", { status: 409 });
    }
    if (Date.now() < meetTs) {
      return new Response("Too early to complete meetup", { status: 409 });
    }

    txn.status = "MEETUP_COMPLETED";
    //txn.autoConfirmAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 days
    txn.autoConfirmAt = new Date(Date.now() + 1.5 * 60 * 1000); // +90 seconds
    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "MEETUP_COMPLETED",
      meta: { autoConfirmAt: txn.autoConfirmAt },
    });
    await txn.save();
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "MEETUP_COMPLETED",
    });

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Buyer confirms receipt -> BUYER_CONFIRMED ----
  if (action === "buyer_confirm") {
    const isBuyer = String(txn.buyer) === String(me._id);
    if (!isBuyer) return new Response("Forbidden", { status: 403 });

    // ✅ NEW: confirm directly from DELIVERY_IN_PROGRESS
    if (txn.status !== "DELIVERY_IN_PROGRESS") {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "BUYER_CONFIRMED";
    txn.autoConfirmAt = null;

    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "BUYER_CONFIRMED",
    });

    // record buyer expense
    const spendAmount = Number(txn.total || 0);
    await User.updateOne(
      { _id: txn.buyer },
      { $inc: { expenses: spendAmount } }
    );

    await txn.save();
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "BUYER_CONFIRMED",
    });

    return Response.json({ success: true, status: txn.status });
  }
}
