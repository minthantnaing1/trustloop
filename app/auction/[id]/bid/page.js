// app/auction/[id]/bid/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import Stepper from "@/components/Stepper";
import ConfirmBidButton from "./ConfirmBidButton";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { fmtBKK } from "@/utils/timeAgo";

function ceilBaht(n) {
  return Math.ceil(Number(n) || 0);
}

function minNextBid(product) {
  const base = Number(product?.startingPrice) || 0;
  const last = Number(product?.currentBid?.amount) || 0;
  const inc = ceilBaht(base * 0.05); // ✅ fixed: always base increment
  const ref = last > 0 ? last : base;
  return ceilBaht(ref + inc);
}

export const dynamic = "force-dynamic";

export default async function AuctionBidPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  if (!sessionEmail) redirect(`/auction/${id}`);

  // fetch product
  const prodRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" },
  );
  if (!prodRes.ok) return redirect(`/auction/${id}`);
  const product = await prodRes.json();

  // guards
  if (product.type !== "auction") return redirect(`/${product.type}/${id}`);
  if (product.owner?.email === sessionEmail) return redirect(`/auction/${id}`);
  if (product.isAvailable === false) return redirect(`/auction/${id}`);

  const endsAt = product?.auctionEndsAt
    ? new Date(product.auctionEndsAt)
    : null;
  if (endsAt && endsAt.getTime() <= Date.now())
    return redirect(`/auction/${id}`);

  // ✅ Require Phone + Location
  await connectDB();
  const me = await User.findOne({ email: sessionEmail })
    .select("phone location")
    .lean();

  if (!me?.phone || !me?.location) {
    return redirect(`/auction/${id}`); // product page button will trigger the modal
  }

  const minBid = minNextBid(product);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Place a Bid</h1>
          <BackButton />
        </div>

        <div className="mb-5">
          <Stepper current={1} variant="buyer" className="px-1" />
        </div>

        <div className="bg-white border border-gray-300 rounded-[5px] shadow-xl p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left snapshot */}
            <div className="flex-1">
              <div className="flex gap-4">
                <img
                  src={
                    product.defaultImage ||
                    product.images?.[0] ||
                    "/placeholder.png"
                  }
                  alt={product.title}
                  className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] rounded-[5px] object-cover border border-gray-300 shadow-sm"
                />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#1f2f4c]">
                    {product.title}
                  </h2>

                  <div className="mt-2 text-[14px] text-gray-600 space-y-1">
                    <div>
                      Seller:{" "}
                      <span className="font-semibold text-[#1f2f4c]">
                        {product.owner?.name || "-"}
                      </span>
                    </div>

                    <div>
                      Base price:{" "}
                      <span className="font-semibold">
                        ฿{Number(product.startingPrice || 0).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      Current highest:{" "}
                      <span className="font-semibold">
                        ฿
                        {Number(
                          product.currentBid?.amount ||
                            product.startingPrice ||
                            0,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[#325082]">
                      Minimum next bid:&nbsp;
                      <span className="font-semibold">
                        ฿{minBid.toLocaleString()}
                      </span>
                    </div>

                    {product.auctionEndsAt && (
                      <div className="text-rose-700">
                        Ends at:&nbsp;
                        <span className="font-semibold">
                          {fmtBKK(product.auctionEndsAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#325082] mb-2">
                  Bid rules
                </h3>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  <li>Base price must be at least ฿1,000.</li>
                  <li>First valid bid must be ≥ base + 5% of base.</li>
                  <li>Next bids must be ≥ last bid + 5% of base price.</li>
                  <li>Bids after the deadline are rejected.</li>
                </ul>
              </div>
            </div>

            {/* Right form */}
            <div className="w-full lg:w-[460px]">
              <div className="rounded-[5px] border border-gray-300 shadow-md overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#f3f6fb] to-white">
                  <h3 className="font-semibold text-[#325082]">
                    Submit Your Bid
                  </h3>
                </div>

                <form id="auctionBidForm" className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Your bid amount (THB) *
                    </label>
                    <input
                      name="amount"
                      type="number"
                      min={minBid}
                      step="1"
                      required
                      placeholder={`Minimum: ${minBid}`}
                      className="w-full rounded-[5px] border border-[#dbe6ff] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#325082]/30"
                    />
                    <p className="text-xs text-gray-600 ml-1 mt-1">
                      Minimum next bid is ฿{minBid.toLocaleString()}.
                    </p>
                  </div>

                  <div className="mt-2">
                    <ConfirmBidButton
                      productId={product._id}
                      formId="auctionBidForm"
                      minBid={minBid}
                    />
                  </div>

                  <p className="text-xs text-center text-gray-600 -mt-1 leading-relaxed">
                    By placing a bid, you agree to proceed with payment later if
                    you win. (Transaction step will be added next.)
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
