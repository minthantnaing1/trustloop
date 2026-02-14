// app/api/auth/check-banned/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ banned: false }, { status: 200 });
  }

  await connectDB();
  const u = await User.findOne({ email }).select("status").lean();

  return Response.json({ banned: u?.status === "banned" }, { status: 200 });
}
