import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export async function GET(req) {
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

  const txns = await Transaction.find(match)
    .sort({ updatedAt: -1 })
    .limit(200)
    .populate({ path: "product", select: "title price defaultImage" })
    .populate({ path: "buyer", select: "email name" })
    .populate({ path: "seller", select: "email name" })
    .lean();

  // Return directly; Next can JSON this fine.
  return Response.json(txns, { status: 200 });
}
