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
      "_id role"
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

    const now = new Date();

    // 🔁 GENERIC STATUS CHANGE (admin override)
    if (action === "set_status") {
      if (!status) return new Response("Missing status", { status: 400 });

      txn.status = status;

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

      await User.updateOne(
        { _id: txn.seller },
        { $inc: { revenue: Number(txn.total || 0) } }
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
      "_id role"
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    // ↓ include product id so we can free the listing + BOTH receipts
    const txn = await Transaction.findById(id).select(
      "buyerReceiptUrl adminPayoutReceiptUrl product"
    );
    if (!txn) return new Response("Not found", { status: 404 });

    // Remove any Cloudinary receipts (buyer + admin). De-dupe just in case.
    const pids = new Set(
      [txn.buyerReceiptUrl, txn.adminPayoutReceiptUrl]
        .filter(Boolean)
        .map((url) => extractPublicId(url))
        .filter(Boolean)
    );

    await Promise.allSettled(
      Array.from(pids).map(async (pid) => {
        try {
          await cloudinary.uploader.destroy(pid);
        } catch (e) {
          console.warn("cloudinary destroy failed:", pid, e?.message);
        }
      })
    );

    // ↓ make the product available again if there is one
    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }

    await Transaction.deleteOne({ _id: id });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/transactions/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
