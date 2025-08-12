// app/api/transactions/[id]/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import mongoose from "mongoose";

// GET /api/transactions/:id
export async function GET(_req, { params }) {
  const { id } = await params; // 👈 await params
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me) return new Response("User not found", { status: 404 });

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response("Invalid id", { status: 400 });
  }

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

  return Response.json(JSON.parse(JSON.stringify(txn)));
}

// PATCH /api/transactions/:id
export async function PATCH(req, { params }) {
  const { id } = await params; // 👈 await params
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me) return new Response("User not found", { status: 404 });

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return new Response("Invalid id", { status: 400 });
  }

  const txn = await Transaction.findById(id);
  if (!txn) return new Response("Not found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { action } = body || {};

  if (action === "upload_receipt") {
    const { imageBase64 } = body || {};
    if (!imageBase64)
      return new Response("imageBase64 required", { status: 400 });

    const canUpload =
      String(txn.buyer) === String(me._id) || me.role === "admin";
    if (!canUpload) return new Response("Forbidden", { status: 403 });

    if (txn.expiresAt && txn.expiresAt.getTime() < Date.now()) {
      return new Response("Order expired", { status: 410 });
    }

    txn.buyerPaymentReceiptB64 = imageBase64;
    txn.status = "AWAITING_ADMIN_REVIEW";
    txn.timeline.push({ by: me._id, action: "BUYER_UPLOADED_RECEIPT" });
    await txn.save();

    return Response.json({ success: true });
  }

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

    return Response.json({ success: true });
  }

  return new Response("Unknown action", { status: 400 });
}
