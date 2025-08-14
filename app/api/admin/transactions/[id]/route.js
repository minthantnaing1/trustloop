import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
  const { id } = await params; // keep your style

  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me || me.role !== "admin")
    return new Response("Forbidden", { status: 403 });

  if (!mongoose.Types.ObjectId.isValid(id))
    return new Response("Invalid id", { status: 400 });

  // Read op + optional reason
  let op, reason;
  try {
    const body = await req.json();
    op = body?.op;
    reason = body?.reason;
  } catch {}
  const url = new URL(req.url);
  op = op ?? url.searchParams.get("op");
  if (!op)
    return new Response("Missing 'op' (verify|reject).", { status: 400 });

  // IMPORTANT: include legacy base64 so we can check for it
  const txn = await Transaction.findById(id)
    .select("+buyerPaymentReceiptB64")
    .populate("product");
  if (!txn) return new Response("Not found", { status: 404 });

  // Admin acts only when waiting for review
  if (txn.status !== "AWAITING_ADMIN_REVIEW") {
    return new Response("Invalid state", { status: 409 });
  }

  if (op === "verify") {
    const hasReceipt = Boolean(
      txn.buyerReceiptUrl || txn.buyerPaymentReceiptB64
    );
    if (!hasReceipt)
      return new Response("No buyer receipt uploaded.", { status: 409 });

    txn.status = "ESCROW_FUNDED";
    txn.timeline.push({
      by: me._id,
      at: new Date(),
      action: "ADMIN_VERIFIED_PAYMENT",
      meta: { via: txn.buyerReceiptUrl ? "url" : "base64" },
    });
    txn.updatedAt = new Date();
    await txn.save();

    // Lock product
    if (txn.product?._id) {
      await Product.updateOne(
        { _id: txn.product._id },
        { $set: { isAvailable: false } }
      );
    }

    return Response.json({ ok: true, status: txn.status });
  }

  if (op === "reject") {
    txn.status = "REJECTED";
    txn.timeline.push({
      by: me._id,
      at: new Date(),
      action: "ADMIN_REJECTED_RECEIPT",
      meta: { reason: reason || "invalid_receipt" },
    });
    txn.updatedAt = new Date();
    await txn.save();

    return Response.json({ ok: true, status: txn.status });
  }

  return new Response("Unsupported op. Use 'verify' or 'reject'.", {
    status: 400,
  });
}
