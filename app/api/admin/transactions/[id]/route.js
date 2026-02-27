// app/api/admin/transactions/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import cloudinary from "@/lib/cloudinary";
import mongoose from "mongoose";
import { notifyTxnEvent } from "@/lib/notify";

function extractPublicId(url = "") {
  try {
    const afterUpload = url.split("/upload/")[1];
    return afterUpload
      .split("/")
      .slice(1)
      .join("/")
      .replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

// PATCH /api/admin/transactions/:id
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role",
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { action, status, reason, payoutUrl } = body;

    if (!action) return new Response("Missing action", { status: 400 });

    const txn = await Transaction.findById(id).populate("product");
    if (!txn) return new Response("Not found", { status: 404 });

    const kindUp = String(txn?.kind || txn?.type || "").toUpperCase();
    const productType = String(txn?.product?.type || "").toLowerCase();

    // infer kind if txn.kind not set
    const effectiveKind =
      kindUp ||
      (productType === "donation"
        ? "DONATION"
        : productType === "auction"
          ? "AUCTION"
          : "BUY_SELL");

    const isPaidFlow =
      effectiveKind === "BUY_SELL" || effectiveKind === "AUCTION";

    const now = new Date();

    // 🔁 GENERIC STATUS CHANGE (admin override)
    if (action === "set_status") {
      if (!status) return new Response("Missing status", { status: 400 });

      txn.status = status;

      // ✅ If admin cancels/rejects, release the product back to available
      const next = String(status || "").toUpperCase();
      const shouldRelease =
        next === "CANCELLED_BY_BUYER" ||
        next === "CANCELLED_BY_SELLER" ||
        next === "REJECTED_BY_ADMIN";

      if (shouldRelease && txn.product) {
        // txn.product might be populated doc or just ObjectId
        const productId = txn.product?._id || txn.product;
        await Product.updateOne(
          { _id: productId },
          { $set: { isAvailable: true } },
        );
      }

      // ✅ If admin manually sets payment successful (testing), allow refund flow later
      if (status === "PAYMENT_SUCCESSFUL") {
        txn.hasPaymentSucceeded = true;
      }

      if (status === "REJECTED_BY_ADMIN" && reason) {
        txn.adminRejectReason = reason;
      }

      txn.timeline.push({
        by: me._id,
        at: now,
        action: "ADMIN_STATUS_OVERRIDE",
        meta: { status, reason },
      });

      txn.updatedAt = now;
      await txn.save();

      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "ADMIN_STATUS_OVERRIDE",
      });

      return Response.json({ ok: true, status: txn.status });
    }

    // 💵 REFUND (buyer gets 95%, platform keeps 5%)
    if (action === "mark_refunded") {
      const { refundUrl, refundFee, buyerRefundNet } = body;

      if (!refundUrl)
        return new Response("refundUrl required", { status: 400 });

      if (!isPaidFlow) {
        return new Response("Refund only for BUY_SELL/AUCTION", {
          status: 409,
        });
      }

      const isCancelled =
        txn.status === "CANCELLED_BY_BUYER" ||
        txn.status === "CANCELLED_BY_SELLER";

      if (!isCancelled) {
        return new Response("Not allowed in current state", { status: 409 });
      }

      if (!txn.hasPaymentSucceeded) {
        return new Response("Cannot refund: payment was never successful", {
          status: 409,
        });
      }

      // prevent double refund
      if (txn.adminRefundReceiptUrl) {
        return new Response("Already refunded", { status: 409 });
      }

      txn.adminRefundReceiptUrl = refundUrl;
      txn.refundFee = Number(refundFee || 0);
      txn.buyerRefundNet = Number(buyerRefundNet || 0);
      txn.refundedAt = now;

      txn.timeline.push({
        by: me._id,
        at: now,
        action: "ADMIN_REFUNDED_BUYER",
        meta: {
          refundUrl,
          refundFee: txn.refundFee,
          buyerRefundNet: txn.buyerRefundNet,
        },
      });

      txn.updatedAt = now;
      await txn.save();

      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "ADMIN_REFUNDED_BUYER",
      });

      return Response.json({ ok: true });
    }

    // 💸 PAYOUT
    if (action === "mark_paid") {
      if (!payoutUrl)
        return new Response("payoutUrl required", { status: 400 });

      if (txn.status !== "BUYER_CONFIRMED") {
        return new Response("Not allowed in current state", { status: 409 });
      }

      txn.status = "PAID_OUT";
      txn.adminPayoutReceiptUrl = payoutUrl;

      txn.timeline.push({
        by: me._id,
        at: now,
        action: "ADMIN_PAID_OUT",
        meta: { payoutUrl },
      });

      const sellerRevenue = Number(txn.sellerNet ?? 0);

      await User.updateOne(
        { _id: txn.seller },
        { $inc: { revenue: sellerRevenue } },
      );

      txn.updatedAt = now;
      await txn.save();

      await notifyTxnEvent({
        txn,
        actorId: me._id,
        type: "ADMIN_PAID_OUT",
      });

      return Response.json({ ok: true, status: txn.status });
    }

    return new Response("Unsupported action", { status: 400 });
  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/admin/transactions/:id
export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role",
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    // ↓ include product id so we can free the listing + BOTH receipts
    const txn = await Transaction.findById(id).select(
      "adminRefundReceiptUrl adminPayoutReceiptUrl product",
    );
    if (!txn) return new Response("Not found", { status: 404 });

    // Remove any Cloudinary receipts (buyer + admin). De-dupe just in case.
    const pids = new Set(
      [txn.adminRefundReceiptUrl, txn.adminPayoutReceiptUrl]
        .filter(Boolean)
        .map((url) => extractPublicId(url))
        .filter(Boolean),
    );

    await Promise.allSettled(
      Array.from(pids).map(async (pid) => {
        try {
          await cloudinary.uploader.destroy(pid);
        } catch (e) {
          console.warn("cloudinary destroy failed:", pid, e?.message);
        }
      }),
    );

    // ↓ make the product available again if there is one
    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } },
      );
    }

    await Transaction.deleteOne({ _id: id });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/transactions/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
