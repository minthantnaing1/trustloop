export const runtime = "nodejs"; // ensure Node runtime
export const dynamic = "force-dynamic"; // no static caching
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me || me.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    // No filters — just show recent transactions
    const txns = await Transaction.find({})
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate({ path: "product", select: "title price defaultImage" })
      .populate({ path: "buyer", select: "email name" })
      .populate({ path: "seller", select: "email name" })
      .lean();

    // Return as-is (includes buyerPaymentReceiptB64 if present),
    // since page is a client component and won’t hit RSC limits.
    // Also stringify _id for safety.
    const shaped = txns.map((t) => ({ ...t, _id: t._id?.toString() }));

    return Response.json(shaped, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
