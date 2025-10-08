// SERVER component
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import DonationClient from "./DonationClient";

export const dynamic = "force-dynamic";

export default async function DonationPage() {
  const cookieStore = await cookies();

  // pull donation products
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products?type=donation`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  const initial = res.ok
    ? await res.json() // { products, userEmail }
    : { products: [], userEmail: "" };

  // ✅ also compute donation posting requirements (same as sell)
  const session = await auth();
  let donateGuard = {
    ok: false,
    missing: ["Default QR Scan", "Phone", "Location"],
  };

  if (session?.user?.email) {
    await connectDB();
    const me = await User.findOne({ email: session.user.email })
      .select("defaultScanCode phone location")
      .lean();

    const missing = [];
    if (!me?.defaultScanCode) missing.push("Default QR Scan");
    if (!me?.phone) missing.push("Phone");
    if (!me?.location) missing.push("Location");

    donateGuard = { ok: missing.length === 0, missing };
  }

  // pass guard to client; client decides on button click whether to block or continue
  return <DonationClient initial={{ ...initial, donateGuard }} />;
}
