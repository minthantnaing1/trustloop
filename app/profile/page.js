// app/profile/page.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import MyProductCard from "@/components/MyProductCard";
import SlipLink from "@/components/SlipLink";
import ProfileKindClient from "./ProfileKindClient";

import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

// Keep only fields MyProductCard needs, and make them serializable
function toPlainProduct(p) {
  if (!p) return null;
  // normalize a lowercase type for the card (supports either `type` or `kind`)
  const rawType = (p.type || p.kind || "").toString().toLowerCase();
  return {
    _id: p._id?.toString(),
    title: p.title ?? "",
    price: typeof p.price === "number" ? p.price : Number(p.price || 0),
    defaultImage: p.defaultImage || null,
    images: Array.isArray(p.images) ? p.images : [],
    category: p.category ?? "",
    createdAt: p.createdAt || null,
    type: rawType, // <- needed for DONATION pill / routing
    kind: p.kind || p.type || "", // <- just in case
    requestDeadline: p.requestDeadline || null, // <- for donation deadline
  };
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  await connectDB();

  const user = await User.findOne({ email: session.user.email }).lean();
  if (!user?._id) redirect("/");

  const [sellingProducts, boughtTxns, soldTxns] = await Promise.all([
    // Active listings you are currently selling
    Product.find({ owner: user._id, isAvailable: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .select(
        "title price images defaultImage category createdAt type kind requestDeadline isAvailable",
      )
      .lean(),

    // Purchases you've completed (buyer side)
    Transaction.find({
      buyer: user._id,
      status: { $in: ["BUYER_CONFIRMED", "PAID_OUT"] },
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({
        path: "product",
        select:
          "title price images defaultImage category createdAt type kind requestDeadline isAvailable",
        lean: true,
      })
      .lean(),

    // Sales you've completed (seller side)
    Transaction.find({
      seller: user._id,
      status: { $in: ["PAID_OUT", "BUYER_CONFIRMED"] },
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({
        path: "product",
        select:
          "title price images defaultImage category createdAt type kind requestDeadline isAvailable",
        lean: true,
      })
      .lean(),
  ]);

  const sellingPlain = sellingProducts.map(toPlainProduct).filter(Boolean);

  const boughtProducts = boughtTxns
    .map((t) => {
      const p = toPlainProduct(t.product);
      return p
        ? {
            ...p,
            orderId: t._id.toString(),
            orderStatus: t.status,
            viewerRole: "buyer",
          }
        : null;
    })
    .filter(Boolean);

  const soldProducts = soldTxns
    .map((t) => {
      const p = toPlainProduct(t.product);
      return p
        ? {
            ...p,
            orderId: t._id.toString(),
            orderStatus: t.status,
            viewerRole: "seller",
          }
        : null;
    })
    .filter(Boolean);

  // ✅ Cloudinary / remote image => use <img> (NO onError in Server Components)
  const profileImg = user?.image || "";
  const isRemoteProfileImg =
    typeof profileImg === "string" && /^https?:\/\//.test(profileImg);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-9 px-3">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">My Profile</h1>
          <Link href="/profile/edit">
            <ActionButton text="Edit Profile" variant="primaryClick" />
          </Link>
        </div>

        {/* Top Section */}
        <section className="flex flex-wrap justify-between items-start gap-5">
          {/* Profile Box */}
          <div className="flex-1 min-w-[300px]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-white rounded-[10px] p-4 max-w-[450px] sm:ml-[110px] mx-auto">
              {profileImg ? (
                isRemoteProfileImg ? (
                  <img
                    src={profileImg}
                    width={120}
                    height={120}
                    alt="Profile"
                    className="rounded-full object-cover w-[120px] h-[120px]"
                  />
                ) : (
                  <Image
                    src={profileImg}
                    width={120}
                    height={120}
                    alt="Profile"
                    className="rounded-full object-cover w-[120px] h-[120px]"
                  />
                )
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
              <div className="text-[#ffcc00] text-[21px]">
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

        {/* Contact & Payment */}
        <section className="mt-6 mb-8">
          <div className="bg-white rounded-[6px] p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Left: Scan / QR */}
              <div className="md:w-1/3 w-full">
                <div className="rounded-[3px] border border-[#e7ecf8] bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0f4ff]">
                    <h3 className="text-sm font-semibold text-[#1f2f4c]">
                      My Default Qr Scan
                    </h3>
                    {user.defaultScanCode && (
                      <SlipLink
                        url={user.defaultScanCode}
                        title="My Default Qr Scan"
                      >
                        Open full size
                      </SlipLink>
                    )}
                  </div>

                  <div className="relative w-full bg-[#f6f9ff] border-t border-[#e7ecf8]">
                    {user.defaultScanCode ? (
                      <>
                        <div className="h-[200px] flex items-center justify-center p-1">
                          <img
                            src={user.defaultScanCode}
                            alt="Default scan code"
                            className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-[1.02]"
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center px-3 pb-1.5">
                          This QR will be used for payouts and transfers as
                          default.
                        </p>
                      </>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
                        <div className="text-center">
                          <div className="mb-2">No scan code uploaded</div>
                          <Link
                            href="/profile/edit"
                            className="text-[#325082] underline"
                          >
                            Add one
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Info Rows */}
              <div className="md:flex-1 w-full">
                <h3 className="text-sm font-semibold text-[#1f2f4c] mb-4">
                  Contact & Payment
                </h3>

                <div className="w-full rounded-[3px] border border-[#eef2fb] overflow-hidden bg-[#fbfdff]">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] items-center h-12 px-3 sm:px-4 border-b border-[#e7ecf8]">
                    <span className="text-sm text-gray-500">Phone -</span>
                    <span className="text-sm font-medium text-gray-900 text-right truncate">
                      {user.phone ? (
                        <a href={`tel:${user.phone}`} className="underline">
                          {user.phone}
                        </a>
                      ) : (
                        "Not set"
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] items-center h-12 px-3 sm:px-4 border-b border-[#e7ecf8]">
                    <span className="text-sm text-gray-500">
                      Default Location -
                    </span>
                    <span className="text-sm font-medium text-gray-900 text-right truncate">
                      {user.location?.trim() || "Not set"}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] items-center h-12 px-3 sm:px-4 border-b border-[#e7ecf8]">
                    <span className="text-sm text-gray-500">
                      Bank Account Name -
                    </span>
                    <span className="text-sm font-medium text-gray-900 text-right truncate">
                      {user.bankAccountName || "Not set"}
                    </span>
                  </div>

                  <div className="grid grid-cols-[140px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] items-center h-12 px-3 sm:px-4">
                    <span className="text-sm text-gray-500">
                      Bank Account Number -
                    </span>
                    <span className="text-sm font-medium text-gray-900 text-right truncate">
                      {user.bankAccountNumber || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kind filter + sections (client island) */}
        <ProfileKindClient
          sellingPlain={sellingPlain}
          boughtProducts={boughtProducts}
          soldProducts={soldProducts}
        />
      </main>
    </>
  );
}
