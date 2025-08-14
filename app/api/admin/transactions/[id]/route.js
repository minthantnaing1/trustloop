// app/api/admin/transactions/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
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

  const txn = await Transaction.findById(id).populate("product");
  if (!txn) return new Response("Not found", { status: 404 });

  if (txn.status !== "AWAITING_ADMIN_REVIEW") {
    return new Response("Invalid state", { status: 409 });
  }

  if (op === "verify") {
    if (!txn.buyerReceiptUrl) {
      return new Response("No buyer receipt uploaded.", { status: 409 });
    }

    txn.status = "ESCROW_FUNDED";
    txn.timeline.push({
      by: me._id,
      at: new Date(),
      action: "ADMIN_VERIFIED_PAYMENT",
      meta: { via: "url" },
    });
    txn.updatedAt = new Date();
    await txn.save();

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
