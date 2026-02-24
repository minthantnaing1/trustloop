// app/auction/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AuctionClient from "./AuctionClient";

export const dynamic = "force-dynamic";

export default async function AuctionPage() {
  const cookieStore = await cookies();

  // pull auction products
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products?type=auction`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );

  const initial = res.ok
    ? await res.json() // { products, userEmail }
    : { products: [], userEmail: "" };

  // ✅ compute posting requirements (same as sell/donation)
  const session = await auth();
  let auctionGuard = {
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

    auctionGuard = { ok: missing.length === 0, missing };
  }

  return <AuctionClient initial={{ ...initial, auctionGuard }} />;
}
