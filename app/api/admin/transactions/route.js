export const runtime = "nodejs"; // ensure Node (not Edge)
export const dynamic = "force-dynamic"; // no static caching
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(req) {
  try {
    // 1) Auth guard
    let session = null;
    try {
      session = await auth();
    } catch (e) {
      console.error("auth error:", e);
      return new Response("Unauthorized", { status: 401 });
    }
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    // 2) DB
    try {
      await connectDB();
    } catch (e) {
      console.error("connectDB error:", e);
      return new Response("DB error", { status: 500 });
    }

    // 3) Admin guard
    let me = null;
    try {
      me = await User.findOne({ email: session.user.email }).lean();
    } catch (e) {
      console.error("find user error:", e);
      return new Response("User lookup error", { status: 500 });
    }
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    const { searchParams } = new URL(req.url);
    const receiptId = searchParams.get("receipt");

    // --- A) Single-receipt fetch (lazy load for the modal) ---
    if (receiptId) {
      try {
        // only retrieve the big field for a single id
        const txn = await Transaction.findById(receiptId)
          .select("buyerPaymentReceiptB64")
          .lean();

        if (!txn?.buyerPaymentReceiptB64) {
          return new Response("Not Found", { status: 404 });
        }
        return Response.json(
          { dataUrl: txn.buyerPaymentReceiptB64 },
          { status: 200 }
        );
      } catch (e) {
        console.error("receipt fetch error:", e);
        return new Response("Receipt fetch error", { status: 500 });
      }
    }

    // --- B) List fetch (NO base64 in payload) ---
    let docs = [];
    try {
      docs = await Transaction.find({}, "-buyerPaymentReceiptB64") // <— exclude big field
        .sort({ updatedAt: -1 })
        .limit(200)
        .populate({ path: "product", select: "title price defaultImage" })
        .populate({ path: "buyer", select: "email name" })
        .populate({ path: "seller", select: "email name" })
        .lean();
    } catch (e) {
      console.error("transactions list error:", e);
      return new Response("Query error", { status: 500 });
    }

    // We can’t know hasReceipt without loading the field. Just omit it;
    // the client will try loading when user opens the modal and show an error if 404.
    const items = docs.map((t) => ({
      ...t,
      _id: t._id?.toString?.() || String(t._id),
    }));

    return Response.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions fatal:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
