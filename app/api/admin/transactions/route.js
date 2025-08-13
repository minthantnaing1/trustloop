import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs"; // ensure Node (not Edge)
export const dynamic = "force-dynamic"; // no static caching
export const revalidate = 0;

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("status") || "ALL";
    const status = String(raw).toUpperCase();
    const match = status === "ALL" ? {} : { status };

    // Fetch normally, then strip the big field before returning
    const items = await Transaction.find(match)
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate({ path: "product", select: "title price defaultImage" })
      .populate({ path: "buyer", select: "email name" })
      .populate({ path: "seller", select: "email name" })
      .lean();

    const shaped = items.map((t) => {
      const hasReceipt = !!t.buyerPaymentReceiptB64;
      delete t.buyerPaymentReceiptB64; // 🔑 do not send base64
      return {
        ...t,
        _id: t._id?.toString(),
        hasReceipt,
      };
    });

    return Response.json(shaped, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
