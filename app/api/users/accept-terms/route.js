export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const version = String(body?.version || "v1");

  // ✅ keep your existing admin/dev logic consistent
  const DEV_EMAILS = ["u6530233@au.edu"];
  const isDev = DEV_EMAILS.includes(email);
  const isAdmin = isDev;

  const name = session?.user?.name || "";
  const image = session?.user?.image || "";

  // ✅ If user doesn't exist yet (new user), create it here.
  // ✅ If user exists, just update terms fields.
  await User.updateOne(
    { email },
    {
      $setOnInsert: {
        name,
        email,
        image,
        role: isAdmin ? "admin" : "user",
        adminRank: isDev ? "DEVELOPER" : "NORMAL",
      },
      $set: {
        agreedToTerms: true,
        agreedToTermsAt: new Date(),
        agreedToTermsVersion: version,
      },
    },
    { upsert: true },
  );

  return Response.json({ ok: true }, { status: 200 });
}
