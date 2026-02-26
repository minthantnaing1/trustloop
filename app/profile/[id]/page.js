// app/profile/[id]/page.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import MaskedUserId from "@/components/MaskedUserId";
import PublicProfileKindClient from "./PublicProfileKindClient";

export const dynamic = "force-dynamic";

// Keep only fields MyProductCard needs, and make them serializable
function toPlainProduct(p) {
  if (!p) return null;

  const rawType = (p.type || p.kind || "").toString().toLowerCase();

  return {
    _id: p._id?.toString(),
    title: p.title ?? "",
    price: typeof p.price === "number" ? p.price : Number(p.price || 0),
    defaultImage: p.defaultImage || null,
    images: Array.isArray(p.images) ? p.images : [],
    category: p.category ?? "",
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,

    // for donation tab filtering
    type: rawType,
    kind: p.kind || p.type || "",

    requestDeadline: p.requestDeadline
      ? new Date(p.requestDeadline).toISOString()
      : null,

    isAvailable: Boolean(p.isAvailable),

    // include so client can double-check (safe)
    isHidden: Boolean(p.isHidden),

    owner: p.owner ? p.owner.toString() : undefined,
    seller: p.seller ? p.seller.toString() : undefined,
  };
}

export default async function PublicProfilePage({ params }) {
  const { id } = await params;

  await connectDB();

  const user = await User.findById(id)
    .select("name email image faculty year rating badges")
    .lean();

  let listingsPlain = [];

  if (user) {
    // ✅ ONLY current + NOT hidden
    // (your Product model uses isHidden)
    const listings = await Product.find({
      owner: id,
      isAvailable: true,
      isHidden: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(80)
      .select(
        "title price images defaultImage category createdAt updatedAt type kind requestDeadline isAvailable owner seller isHidden",
      )
      .lean();

    listingsPlain = (listings || []).map(toPlainProduct).filter(Boolean);

    // ✅ extra safety (in case some old docs store it weirdly)
    listingsPlain = listingsPlain.filter((p) => !p.isHidden);
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">
            Seller Profile (Public)
          </h1>
          <BackButton />
        </div>

        {!user ? (
          <div className="mt-10 text-center text-gray-500">User not found.</div>
        ) : (
          <>
            {/* Top Section */}
            <section className="flex flex-wrap justify-between items-start gap-5">
              {/* Profile Box */}
              <div className="flex-1 min-w-[300px]">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-white rounded-[10px] p-4 max-w-[450px] sm:ml-[110px] mx-auto">
                  {user.image ? (
                    <img
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
                    <p>
                      <MaskedUserId email={user.email} />
                    </p>
                    <p>{user.faculty || "Faculty not set"}</p>
                    <p>{user.year || "Year not set"}</p>
                  </div>
                </div>
              </div>

              {/* Right: Rating box */}
              <div className="flex-1 min-w-[300px] flex flex-wrap gap-3 items-start justify-end">
                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
                  <p>Rating</p>
                  <div className="text-[#ffcc00] text-[21px]">
                    {(() => {
                      const r = Math.round(user.rating || 0);
                      return "★".repeat(r) + "☆".repeat(5 - r);
                    })()}
                  </div>
                </div>

                <div className="flex-1 min-w-[140px] bg-white p-4 rounded-[10px] text-center">
                  <p>Badge</p>
                  <strong>{(user.badges && user.badges[0]) || "None"}</strong>
                </div>
              </div>
            </section>

            {/* ✅ Public listings */}
            <div className="mt-6">
              <PublicProfileKindClient
                userId={id}
                listingsPlain={listingsPlain}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
