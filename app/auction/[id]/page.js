// app/auction/[id]/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import AuctionDetails from "@/components/AuctionDetails";
import { autoAcceptIfDeadlinePassed } from "@/lib/auctionFlow";

export const dynamic = "force-dynamic";

export default async function AuctionProductPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="min-h-[calc(100vh-210px)] flex items-center justify-center">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">🔨</div>
              <h1 className="text-xl font-semibold text-[#1f2d4d]">
                This Auction isn&apos;t available!
              </h1>
              <p className="mt-1 text-slate-600">
                It might have ended or been hidden by the owner. You can browse
                other active auctions below.
              </p>

              <div className="mt-5 flex justify-between">
                <BackButton text="Go back" />
                <Link href="/auction">
                  <ActionButton text="Browse Auctions" variant="primaryClick" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  let product = await res.json();

  // 🚨 redirect if type mismatch
  if (product.type && product.type !== "auction") {
    return redirect(`/${product.type}/${product._id}`);
  }

  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  // ✅ auto-accept highest when deadline passed (if seller didn't accept)
  // Actor can be null, but we can also pass seller id. Keep minimal:
  await autoAcceptIfDeadlinePassed(product._id, { actorUserId: null });

  // re-fetch product so UI shows latest auctionResolution / isAvailable
  const res2 = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
  if (res2.ok) product = await res2.json();
  await connectDB();

  let me = null;
  if (sessionEmail) {
    me = await User.findOne({ email: sessionEmail })
      .select("favorites phone location")
      .lean();
  }

  const initialIsFav = Boolean(
    product.isFav ??
    me?.favorites?.some((fid) => String(fid) === String(product._id)),
  );

  const isOwner = sessionEmail === product.owner?.email;

  // ✅ Bid guard (Phone + Location only)
  const missing = [];
  if (!me?.phone) missing.push("Phone");
  if (!me?.location) missing.push("Location");
  const bidGuard = { ok: missing.length === 0, missing };

  return (
    <AuctionDetails
      product={product}
      sessionEmail={sessionEmail}
      initialIsFav={initialIsFav}
      isOwner={isOwner}
      guard={bidGuard}
    />
  );
}
