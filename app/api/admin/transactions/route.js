export const runtime = "nodejs"; // ✅ ensure Node (Mongoose + auth)
export const dynamic = "force-dynamic"; // ✅ no static caching
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
    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    const { searchParams } = new URL(req.url);
    const receiptId = searchParams.get("receipt"); // ✅ lazy fetch a single receipt

    // --- Return ONE receipt (used by modal) ---
    if (receiptId) {
      const txn = await Transaction.findById(receiptId)
        .select("buyerPaymentReceiptB64")
        .lean();
      if (!txn?.buyerPaymentReceiptB64)
        return new Response("Not Found", { status: 404 });
      // Always return a tiny JSON wrapper
      return Response.json(
        { dataUrl: txn.buyerPaymentReceiptB64 },
        { status: 200 }
      );
    }

    // --- Return LIST (no base64 in payload) ---
    const docs = await Transaction.find({})
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate({ path: "product", select: "title price defaultImage" })
      .populate({ path: "buyer", select: "email name" })
      .populate({ path: "seller", select: "email name" })
      .lean();

    // Compute hasReceipt, then remove the base64 so response stays small/stable
    const items = docs.map((t) => {
      const hasReceipt = Boolean(t.buyerPaymentReceiptB64);
      delete t.buyerPaymentReceiptB64;
      return { ...t, _id: t._id?.toString(), hasReceipt };
    });

    return Response.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
