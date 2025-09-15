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

  // 🔵 NEW: atomic sweep for expired unpaid txns (works even if user left pay page)
  const now = new Date();

  // 1) Flip status + add timeline (atomic, guarded by current status)
  await Transaction.updateMany(
    {
      status: "PENDING_UPLOAD",
      expiresAt: { $lte: now },
      $or: [{ buyer: me._id }, { seller: me._id }],
    },
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
          meta: { source: "mine_list" },
        },
      },
    }
  );

  // 2) Free products from those expired transactions (recent flips)
  const expiredIds = await Transaction.find({
    status: "CANCELLED_BY_BUYER",
    cancelReason: "timeout",
    updatedAt: { $gte: new Date(now.getTime() - 60_000) },
    $or: [{ buyer: me._id }, { seller: me._id }],
  })
    .select("_id product")
    .lean();

  const productIds = expiredIds.map((x) => x.product).filter(Boolean);
  if (productIds.length) {
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isAvailable: true } }
    );
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
