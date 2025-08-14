export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import Product from "@/models/Product";
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

  // include product id so we can release it on expiry
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
    txn.status = "CANCELLED";
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

  // Buyer uploads receipt (Cloudinary URL only)
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

  // Cancel (buyer or admin) -> release the product
  if (action === "cancel") {
    const { reason = "cancelled" } = body || {};
    const canCancel =
      String(txn.buyer) === String(me._id) || me.role === "admin";
    if (!canCancel) return new Response("Forbidden", { status: 403 });

    if (["PAID_OUT", "CANCELLED", "REJECTED"].includes(txn.status)) {
      return new Response("Already finalized", { status: 409 });
    }

    txn.status = "CANCELLED";
    txn.timeline.push({ by: me._id, action: "CANCELLED", meta: { reason } });
    await txn.save();

    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }

    return Response.json({ success: true });
  }

  return new Response("Unknown action", { status: 400 });
}
