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

  const filter = role === "seller" ? { seller: me._id } : { buyer: me._id };

  const docs = await Transaction.find(filter)
    .sort({ updatedAt: -1 })
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
