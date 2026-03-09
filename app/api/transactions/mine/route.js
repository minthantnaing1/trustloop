// app/api/transactions/mine/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { notifyTxnEvent } from "@/lib/notify";

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

  const now = new Date();

  // 🔵 Sweep expired unpaid txns one-by-one so notifications can be pushed
  const expiredPending = await Transaction.find({
    status: "PENDING_PAYMENT",
    expiresAt: { $lte: now },
    $or: [{ buyer: me._id }, { seller: me._id }],
  }).select("_id product kind");

  for (const txn of expiredPending) {
    const updated = await Transaction.findOneAndUpdate(
      {
        _id: txn._id,
        status: "PENDING_PAYMENT",
        expiresAt: { $lte: now },
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
      },
      { new: true },
    );

    if (!updated) continue;

    const productId = updated.product?._id || updated.product;
    const txnId = updated._id;

    if (productId) {
      if (updated.kind === "AUCTION") {
        const { advanceAuctionWinner } = await import("@/lib/auctionFlow");
        await advanceAuctionWinner(String(productId), String(txnId), {
          actorUserId: me._id,
        });
      } else {
        await Product.updateOne(
          { _id: productId },
          { $set: { isAvailable: true } },
        );
      }
    }

    await notifyTxnEvent({
      txn: updated,
      actorId: null,
      type: "AUTO_CANCELLED_EXPIRED",
    });
  }
  // 🔵 END sweep

  const filter = role === "seller" ? { seller: me._id } : { buyer: me._id };

  const docs = await Transaction.find(filter)
    .sort({ createdAt: -1 })
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
