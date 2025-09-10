// app/favorites/page.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#1f2d4d] mb-2">
            Your Favorites
          </h1>
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

  const items = (me?.favorites || []).map((p) => ({
    _id: String(p._id),
    title: p.title || p.name || "Untitled",
    price: Number(p.price || 0),
    location: p.location || "",
    category: p.category || "",
    condition: p.condition || "",
    ownerName: p.owner?.name || p.owner?.email || "",
    defaultImage:
      p.defaultImage ||
      p.images?.[0]?.url ||
      p.images?.[0] ||
      p.image ||
      "/placeholder.png",
    isAvailable: p.isAvailable !== false,
  }));

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-4 mb-4">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-[#1f2d4d]">
            Your Favorites{" "}
            {items.length > 0 && (
              <span className="text-lg font-normal text-slate-500">
                ({items.length} item{items.length > 1 ? "s" : ""})
              </span>
            )}
          </h1>

          <Link
            href="/buy-sell"
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to Buy & Sell
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="border rounded-2xl bg-white p-10 text-center">
            <div className="text-lg font-medium text-[#1f2d4d] mb-1">
              No favorites yet
            </div>
            <p className="text-sm text-slate-500">
              Tap “ ♡ ” Button on any product to save it here.
            </p>
            <div className="mt-4">
              <Link
                href="/buy-sell"
                className="inline-flex items-center px-4 py-2 bg-[#325082] text-white hover:bg-[#2b446e] text-sm rounded-lg"
              >
                Explore products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <Link
                key={p._id}
                href={`/buy-sell/${p._id}`}
                className="group block bg-white ring-1 ring-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:ring-[#cfd8ff] transition"
              >
                {/* Image */}
                <div className="relative h-44 sm:h-48 bg-slate-100">
                  <img
                    src={p.defaultImage}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-[15px] font-semibold text-[#15243f] line-clamp-2">
                    {p.title}
                  </h3>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[#1f3b66]">
                      <span className="text-sm text-slate-500">Price</span>{" "}
                      <span className="font-bold">
                        ฿{p.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Category & Condition shown here (no badges on image) */}
                  <div className="mt-2 text-xs text-slate-600 flex justify-between">
                    {p.category && (
                      <span className="inline-block">
                        <span className="text-slate-500">Category:</span>{" "}
                        <span className="font-medium text-slate-700">
                          {p.category}
                        </span>
                      </span>
                    )}
                    {p.condition && (
                      <span className="inline-block">
                        <span className="text-slate-500">Condition:</span>{" "}
                        <span className="font-medium text-slate-700">
                          {p.condition}
                        </span>
                      </span>
                    )}
                  </div>

                  {p.ownerName && (
                    <div className="mt-1 text-xs text-slate-500">
                      Seller:{" "}
                      <span className="font-medium text-slate-700">
                        {p.ownerName}
                      </span>
                    </div>
                  )}

                  {!p.isAvailable && (
                    <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      This item is currently reserved or unavailable.
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
