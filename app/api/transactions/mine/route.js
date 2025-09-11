// app/api/transactions/mine/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  if (!me) return new Response("User not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") === "seller" ? "seller" : "buyer";

  // 🔵 NEW: sweep expired unpaid txns for this user
  const now = new Date();
  const expired = await Transaction.find({
    status: "PENDING_UPLOAD",
    expiresAt: { $lte: now },
    $or: [{ buyer: me._id }, { seller: me._id }],
  }).select("_id product status updatedAt expiresAt timeline"); // ⬅️ include the fields you change

  for (const tx of expired) {
    tx.status = "CANCELLED_BY_BUYER";
    tx.cancelReason = "timeout";
    tx.updatedAt = now;
    tx.timeline.push({
      at: now,
      by: me._id,
      action: "AUTO_CANCELLED_EXPIRED",
      meta: { source: "mine_list" },
    });
    await tx.save();
    if (tx.product) {
      await Product.updateOne(
        { _id: tx.product },
        { $set: { isAvailable: true } }
      );
    }
  }
  // 🔵 END sweep

  const filter = role === "seller" ? { seller: me._id } : { buyer: me._id };

  const docs = await Transaction.find(filter)
    .sort({ createdAt: -1 }) // ← was { updatedAt: -1 }
    .limit(200)
    .populate({ path: "product", select: "title defaultImage price" })
    .populate({ path: "buyer", select: "email name" })
    .populate({ path: "seller", select: "email name" })
    .lean();

  const items = (docs || []).map((t) => ({
    ...t,
    _id: t._id?.toString?.() || String(t._id),
  }));

  return Response.json(items, { status: 200 });
}
