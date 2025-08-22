import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";

import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import MyProductCard from "@/components/MyProductCard";

import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

// keep only the fields MyProductCard needs, and make them serializable
function toPlainProduct(p) {
  if (!p) return null;
  return {
    _id: p._id?.toString(),
    title: p.title ?? "",
    price: typeof p.price === "number" ? p.price : Number(p.price || 0),
    defaultImage: p.defaultImage || null,
    images: Array.isArray(p.images) ? p.images : [],
  };
}

export default async function ProfilePage() {
  const session = await auth();
  await connectDB();

  const user = await User.findOne({ email: session.user.email }).lean();

  const [sellingProducts, boughtTxns, soldTxns] = await Promise.all([
    Product.find({ owner: user._id, isAvailable: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    Transaction.find({ buyer: user._id, status: "PAID_OUT" })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({
        path: "product",
        select: "title price images defaultImage",
        lean: true,
      })
      .lean(),

    Transaction.find({ seller: user._id, status: "PAID_OUT" })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({
        path: "product",
        select: "title price images defaultImage",
        lean: true,
      })
      .lean(),
  ]);

  const boughtProducts = boughtTxns
    .map((t) => toPlainProduct(t.product))
    .filter(Boolean);
  const soldProducts = soldTxns
    .map((t) => toPlainProduct(t.product))
    .filter(Boolean);
  const sellingPlain = sellingProducts.map(toPlainProduct).filter(Boolean);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-5 px-5">
        {/* Edit Button - Top Right */}
        <div className="flex justify-end mb-4">
          <Link href="/profile/edit">
            <ActionButton text="Edit Profile" variant="primaryClick" />
          </Link>
        </div>

        {/* Top Section */}
        <section className="flex flex-wrap justify-between items-start gap-5">
          {/* Profile Box */}
          <div className="flex-1 min-w-[300px]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-white rounded-[10px] p-4 max-w-[450px] sm:ml-[110px] mx-auto">
              {user.image ? (
                <Image
                  src={user.image}
                  width={120}
                  height={120}
                  alt="Profile"
                  className="rounded-full object-cover w-[120px] h-[120px]"
                />
              ) : (
                <div className="w-[120px] h-[120px] bg-[#ddd] rounded-full" />
              )}
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <p className="font-bold text-[18px]">{user.name}</p>
                <p>{user.email.split("@")[0]}</p>
                <p>{user.faculty || "Faculty not set"}</p>
                <p>{user.year || "Year not set"}</p>
              </div>
            </div>
          </div>

          {/* Stats Box */}
          <div className="flex-1 min-w-[300px] flex flex-wrap gap-3 items-start justify-end">
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Free Post</p>
              <strong>{user.postingCredits} Left</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Rating</p>
              <div className="text-[#ffcc00] text-[18px]">
                {"★".repeat(Math.round(user.rating || 0)) +
                  "☆".repeat(5 - Math.round(user.rating || 0))}
              </div>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Badge</p>
              <strong>{(user.badges && user.badges[0]) || "None"}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Spending</p>
              <strong>฿{user.expenses || 0}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <p>Revenue</p>
              <strong>฿{user.revenue || 0}</strong>
            </div>
            <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
              <Link href="/my-orders" className="text-blue-800 underline">
                More Transactions
              </Link>
            </div>
          </div>
        </section>

        {/* Centered phone and location below the top section */}
        <div className="flex flex-col items-start ml-[262px] mb-6 space-y-1">
          <p className="text-base text-gray-800">
            <span className="font-semibold">Phone – </span>
            <span className="font-normal">{user.phone || "Not set"}</span>
          </p>
          <p className="text-base text-gray-800">
            <span className="font-semibold">Location – </span>
            <span className="font-normal">
              {user.location?.trim() || "Not set"}
            </span>
          </p>
        </div>

        {/* Your Bought Items */}
        <section className="mb-8 bg-[#f9fafb] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">Your Bought Items</h2>
            <Link href="/buy-sell" className="text-[#325082] underline text-sm">
              See more
            </Link>
          </div>

          {/* Horizontal scroll row */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-2 px-2 no-scrollbar">
            {boughtProducts.length ? (
              boughtProducts
                .slice(0, 8)
                .map((p) => <MyProductCard key={p._id} product={p} />)
            ) : (
              <p className="text-sm text-gray-500 italic">
                No completed purchases yet.
              </p>
            )}
          </div>
        </section>

        {/* Currently Selling */}
        <section className="mb-8 bg-[#f9fafb] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">
              Items You are Currently Selling
            </h2>
            <Link href="/buy-sell" className="text-[#325082] underline text-sm">
              See more
            </Link>
          </div>

          {/* Horizontal scroll row */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-2 px-2 no-scrollbar">
            {sellingPlain.length ? (
              sellingPlain
                .slice(0, 8)
                .map((p) => <MyProductCard key={p._id} product={p} />)
            ) : (
              <p className="text-sm text-gray-500 italic">
                No active listings.
              </p>
            )}
          </div>
        </section>

        {/* Your Sold Items */}
        <section className="mb-12 bg-[#f9fafb] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">Your Sold Items</h2>
            <Link href="/buy-sell" className="text-[#325082] underline text-sm">
              See more
            </Link>
          </div>

          {/* Horizontal scroll row */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-2 px-2 no-scrollbar">
            {soldProducts.length ? (
              soldProducts
                .slice(0, 8)
                .map((p) => <MyProductCard key={p._id} product={p} />)
            ) : (
              <p className="text-sm text-gray-500 italic">
                No completed sales yet.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
