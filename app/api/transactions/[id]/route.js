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
import { advanceAuctionWinner } from "@/lib/auctionFlow";

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
    "_id role",
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
      },
    );

    if (upd.modifiedCount > 0 && txn.product?._id) {
      // ✅ AUCTION: advance winner queue instead of releasing product
      if (txn.kind === "AUCTION") {
        await advanceAuctionWinner(String(txn.product._id), String(txn._id), {
          actorUserId: me._id,
        });
      } else {
        await Product.updateOne(
          { _id: txn.product._id },
          { $set: { isAvailable: true } },
        );
      }

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

      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "AUTO_CANCELLED_EXPIRED",
      });
    }
  }

  // ✅ Auto-confirm after seller uploaded proof (3 days)
  if (
    txn.status === "SELLER_PROOF_UPLOADED" &&
    txn.autoConfirmAt &&
    txn.autoConfirmAt.getTime() <= Date.now()
  ) {
    const now = new Date();

    // Atomic: only one request will succeed
    const upd = await Transaction.updateOne(
      {
        _id: txn._id,
        status: "SELLER_PROOF_UPLOADED",
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
      },
    );

    if (upd.modifiedCount > 0) {
      // mirror buyer_confirm expenses update once
      await User.updateOne(
        { _id: txn.buyer },
        { $inc: { expenses: Number(txn.total || 0) } },
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
    "_id role",
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
      },
    );

    if (upd.modifiedCount > 0 && txn.product) {
      // ✅ AUCTION: advance winner queue instead of releasing product
      if (txn.kind === "AUCTION") {
        await advanceAuctionWinner(String(txn.product), String(txn._id), {
          actorUserId: me._id,
        });
      } else {
        await Product.updateOne(
          { _id: txn.product },
          { $set: { isAvailable: true } },
        );
      }
    }
    return new Response("Order expired", { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  // ---- Seller accepts (unchanged) ----
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

  // ---- Buyer cancels ----
  if (action === "buyer_cancel") {
    const isBuyer = String(txn.buyer) === String(me._id);
    if (!isBuyer) return new Response("Forbidden", { status: 403 });

    if (
      !["PENDING_PAYMENT", "PAYMENT_SUCCESSFUL", "AWAITING_DONOR"].includes(
        txn.status,
      )
    ) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    const { cancelReason = "" } = body || {};
    const reason = String(cancelReason).trim().slice(0, 300);

    if (!reason) {
      return new Response("Cancellation reason is required.", { status: 400 });
    }

    txn.status = "CANCELLED_BY_BUYER";
    txn.cancelledBy = me._id;
    txn.cancelReason = reason;

    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "CANCELLED_BY_BUYER",
      meta: { reason },
    });

    await txn.save();

    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "CANCELLED_BY_BUYER",
    });

    if (txn.product) {
      if (txn.kind === "AUCTION") {
        await advanceAuctionWinner(String(txn.product), String(txn._id), {
          actorUserId: me._id,
        });
      } else {
        await Product.updateOne(
          { _id: txn.product },
          { $set: { isAvailable: true } },
        );
      }
    }

    return Response.json({ success: true, status: txn.status });
  }

  // ---- Seller cancels after admin approved (allow from funded/accepted/in-delivery) ----
  if (action === "seller_cancel") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (!["PAYMENT_SUCCESSFUL", "AWAITING_DONOR"].includes(txn.status)) {
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
        { $set: { isAvailable: true } },
      );
    }

    return Response.json({ success: true, status: txn.status });
  }

  // ✅ NEW: Seller uploads proof -> start auto-confirm countdown
  if (action === "seller_upload_proof") {
    const isSeller = String(txn.seller) === String(me._id);
    if (!isSeller) return new Response("Forbidden", { status: 403 });

    if (!["DELIVERY_IN_PROGRESS", "SELLER_ACCEPTED"].includes(txn.status)) {
      return new Response("Not allowed in current state", { status: 409 });
    }

    const { proofUrls } = body || {};
    const urls = Array.isArray(proofUrls)
      ? proofUrls.map((s) => String(s || "").trim()).filter(Boolean)
      : [];

    if (urls.length === 0) {
      return new Response("proofUrls is required", { status: 400 });
    }

    const now = new Date();

    // ✅ Change countdown duration here
    // const AUTO_CONFIRM_DAYS = 3;
    // const autoConfirmAt = new Date(
    //   now.getTime() + AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000,
    // );

    // ✅ TEST MODE: 1 minute 30 seconds
    const AUTO_CONFIRM_MS = 90 * 1000;
    const autoConfirmAt = new Date(now.getTime() + AUTO_CONFIRM_MS);

    // (If you want testing: 90 seconds)
    // const autoConfirmAt = new Date(now.getTime() + 90 * 1000);

    txn.status = "SELLER_PROOF_UPLOADED";
    txn.sellerProofUrls = urls;
    txn.sellerProofUploadedAt = now;
    txn.autoConfirmAt = autoConfirmAt;

    txn.timeline.push({
      at: now,
      by: me._id,
      action: "SELLER_PROOF_UPLOADED",
      meta: { count: urls.length, autoConfirmAt },
    });

    await txn.save();

    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "SELLER_PROOF_UPLOADED",
    });

    return Response.json({
      success: true,
      status: txn.status,
      sellerProofUrls: txn.sellerProofUrls,
      autoConfirmAt: txn.autoConfirmAt,
    });
  }

  if (action === "buyer_confirm") {
    const isBuyer = String(txn.buyer) === String(me._id);
    if (!isBuyer) return new Response("Forbidden", { status: 403 });

    // allow confirm ONLY after proof uploaded
    if (txn.status !== "SELLER_PROOF_UPLOADED") {
      return new Response("Not allowed in current state", { status: 409 });
    }

    txn.status = "BUYER_CONFIRMED";
    txn.autoConfirmAt = null;

    txn.timeline.push({
      at: new Date(),
      by: me._id,
      action: "BUYER_CONFIRMED",
    });

    const spendAmount = Number(txn.total || 0);
    await User.updateOne(
      { _id: txn.buyer },
      { $inc: { expenses: spendAmount } },
    );

    await txn.save();

    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "BUYER_CONFIRMED",
    });

    return Response.json({ success: true, status: txn.status });
  }

  return new Response("Unknown action", { status: 400 });
}
