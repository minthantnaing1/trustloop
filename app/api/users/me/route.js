// app/api/users/me/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  await connectDB();

  // No session -> treat as guest; return 200 so callers don’t need to handle 401
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ role: "guest", user: null }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  const user = await User.findOne({ email: session.user.email });

  // ✅ auto-release temporary bans if expired
  if (
    user &&
    user.status === "banned" &&
    user.banType === "TEMPORARY" &&
    user.bannedUntil &&
    new Date(user.bannedUntil) <= new Date()
  ) {
    user.status = "active";
    user.banType = "PERMANENT";
    user.bannedUntil = undefined;
    user.bannedAt = undefined;
    user.bannedReason = "";
    await user.save();
  }

  // Always return role + user (if found). Default role is "user".
  return new Response(
    JSON.stringify({ role: user?.role || "user", user: user || null }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}
