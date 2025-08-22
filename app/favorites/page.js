// app/favorites/page.js
import { auth } from "@/auth";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Your Favorites</h1>
        <p>Please sign in to see the items you liked.</p>
      </div>
    );
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .populate({ path: "favorites", model: Product })
    .lean();

  const items = me?.favorites || [];

  return (
    <>
    <NavBar />
    <div className="max-w-6xl mx-auto p-6 mt-[80px]">
      <h1 className="text-2xl font-semibold mb-6">Your Favorites</h1>

      {items.length === 0 ? (
        <p>No favorites yet. Go like something ♥</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p) => {
            const img =
              p.images?.[0]?.url || p.images?.[0] || p.image || "/placeholder.png";
            const title = p.title || p.name || "Untitled";
            return (
              <Link
                key={p._id}
                href={`/buy-sell/${p._id}`}
                className="rounded-xl border overflow-hidden hover:shadow transition"
              >
                <img
                  src={img}
                  alt={title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <div className="font-medium">{title}</div>
                  <div className="text-sm opacity-70 mt-1">{p.price} ฿</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}
