// app/favorites/page.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import ActionButton from "@/components/ActionButton";
import Link from "next/link";
import FavoritesClient from "./FavoritesClient";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <h1 className="text-2xl font-bold text-[#325082]">My Favorites</h1>
          <p className="text-slate-600">
            Please sign in to see the items you liked.
          </p>
        </main>
      </>
    );
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .populate({ path: "favorites", model: Product })
    .lean();

  let items = (me?.favorites || []).map((p) => ({
    _id: String(p._id),
    title: p.title || p.name || "Untitled",
    price: Number(p.price || 0),
    startingPrice: p.startingPrice != null ? Number(p.startingPrice) : null,
    location: p.location || "",
    category: p.category || "",
    condition: p.condition || "",
    type: p.type || "",
    requestDeadline: p.requestDeadline || null,
    auctionEndsAt: p.auctionEndsAt || null,
    auctionStatus: p.auctionStatus || "",
    defaultImage:
      p.defaultImage ||
      p.images?.[0]?.url ||
      p.images?.[0] ||
      p.image ||
      "/placeholder.png",
    isAvailable: p.isAvailable !== false,
    isHidden: Boolean(p.isHidden),
    createdAt: p.createdAt || null,
  }));

  // attach buyer info for reserved products so badges can say "Reserved by you"
  const favIds = (me?.favorites || []).map((p) => p._id);
  if (favIds.length) {
    const txns = await Transaction.find({ product: { $in: favIds } })
      .populate({ path: "buyer", select: "name email" })
      .lean();

    const byProduct = {};
    for (const t of txns) {
      byProduct[String(t.product)] = {
        buyerName: t?.buyer?.name || t?.buyer?.email || "",
        buyerEmail: t?.buyer?.email || "",
        buyerOrderId: String(t._id),
        buyerOrderStatus: t?.status || "", // 👈 add this line
      };
    }

    items = items.map((it) => {
      const info = byProduct[it._id];
      return info ? { ...it, ...info } : it;
    });
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-3 mb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-[#325082]">
            My Favorites{" "}
            {items.length > 0 && (
              <span className="text-lg font-semibold text-[#325082]">
                ({items.length} item{items.length > 1 ? "s" : ""})
              </span>
            )}
          </h1>
          <BackButton />
        </div>

        {items.length === 0 ? (
          <div className="border border-gray-300 rounded-[6px] shadow-sm bg-white p-10 text-center">
            <div className="text-lg font-medium text-[#1f2d4d] mb-1">
              No favorites yet
            </div>
            <p className="text-sm text-slate-500">
              Tap “ ♡ ” Button on any product to save it here.
            </p>
            <div className="mt-4">
              <Link href="/buy">
                <ActionButton
                  text="Explore Products"
                  variant="primaryClick"
                  className="inline-flex items-center w-[125px]"
                />
              </Link>
            </div>
          </div>
        ) : (
          <FavoritesClient
            items={items}
            currentUserEmail={session?.user?.email || ""}
          />
        )}
      </main>
    </>
  );
}
