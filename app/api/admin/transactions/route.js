// app/api/admin/transactions/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email })
      .select("_id role")
      .lean();
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    // 🔴 SWEEP: cancel any expired PENDING_UPLOAD
    const now = new Date();
    await Transaction.updateMany(
      { status: "PENDING_UPLOAD", expiresAt: { $lte: now } },
      {
        $set: { status: "CANCELLED", updatedAt: now },
        $push: {
          timeline: {
            at: now,
            by: me._id,
            action: "AUTO_CANCELLED_EXPIRED",
            meta: { source: "admin_list_sweep" },
          },
        },
      }
    );

    const { searchParams } = new URL(req.url);
    const receiptId = searchParams.get("receipt");

    if (receiptId) {
      const txn = await Transaction.findById(receiptId)
        .select("+buyerPaymentReceiptB64")
        .lean();
      const b64 = txn?.buyerPaymentReceiptB64;
      if (!b64) return new Response("Not Found", { status: 404 });
      return Response.json({ dataUrl: b64 }, { status: 200 });
    }

    const docs = await Transaction.find({}, "-buyerPaymentReceiptB64")
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate({ path: "product", select: "title price defaultImage" })
      .populate({ path: "buyer", select: "email name" })
      .populate({ path: "seller", select: "email name" })
      .lean();

    const items = docs.map((t) => ({
      ...t,
      _id: t._id?.toString?.() || String(t._id),
      hasReceipt: Boolean(t.buyerReceiptUrl),
    }));

    return Response.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
