// app/sell/page.js

// SERVER component
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const cookieStore = await cookies();

  // pull products as before
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products?type=sell`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  const initial = res.ok
    ? await res.json() // { products, userEmail }
    : { products: [], userEmail: "" };

  // ✅ also compute sell requirements (defaultScanCode, phone, location)
  const session = await auth();
  let sellGuard = {
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

    sellGuard = { ok: missing.length === 0, missing };
  }

  // pass guard to client; client decides on button click whether to block or continue
  return <ProductsClient initial={{ ...initial, sellGuard }} />;
}
