// app/auction/[id]/bid/page.js
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import Stepper from "@/components/Stepper";
import ConfirmBidButton from "./ConfirmBidButton";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import { fmtBKK } from "@/utils/timeAgo";
import DeadlineCountdown from "@/components/DeadlineCountdown";

function ceilBaht(n) {
  return Math.ceil(Number(n) || 0);
}

function minNextBid(product, auction) {
  const base = Number(product?.startingPrice) || 0;
  const last = Number(auction?.currentBid?.amount) || 0;
  const inc = ceilBaht(base * 0.05);
  const ref = last > 0 ? last : base;
  return ceilBaht(ref + inc);
}

export const dynamic = "force-dynamic";

export default async function AuctionBidPage({ params }) {
  const { id } = await params;
  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  if (!sessionEmail) redirect(`/auction/${id}`);

  await connectDB();

  const product = await Product.findById(id).populate("owner").lean();
  if (!product) return redirect(`/auction`);

  // guards
  if (product.type !== "auction") return redirect(`/${product.type}/${id}`);
  if (product.owner?.email === sessionEmail) return redirect(`/auction/${id}`);
  if (product.isAvailable === false) return redirect(`/auction/${id}`);
  if (product.isHidden) return redirect(`/auction/${id}`);

  const auction = await Auction.findOne({ product: product._id })
    .populate({ path: "currentBid.bidder", select: "name email image" })
    .lean();

  if (!auction) return redirect(`/auction/${id}`);
  if (auction.status !== "OPEN") return redirect(`/auction/${id}`);

  const endsAt = product?.auctionEndsAt
    ? new Date(product.auctionEndsAt)
    : auction?.endsAt
      ? new Date(auction.endsAt)
      : null;

  if (endsAt && endsAt.getTime() <= Date.now())
    return redirect(`/auction/${id}`);

  // Require Phone + Location
  const me = await User.findOne({ email: sessionEmail })
    .select("phone location")
    .lean();

  if (!me?.phone || !me?.location) {
    return redirect(`/auction/${id}`);
  }

  // block same bidder twice in a row (server route also checks)
  const lastBidderEmail = auction?.currentBid?.bidder?.email || "";
  if (lastBidderEmail && lastBidderEmail === sessionEmail) {
    return redirect(`/auction/${id}`);
  }

  const minBid = minNextBid(product, auction);

  const currentHighest =
    Number(auction?.currentBid?.amount) || Number(product.startingPrice || 0);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Place a Bid</h1>
          <BackButton />
        </div>

        {/* <div className="mb-5">
          <Stepper current={1} variant="auctionBuyer" className="px-1" />
        </div> */}

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
                      Category:{" "}
                      <span className="font-semibold">{product.category}</span>
                    </div>

                    <div>
                      Condition:{" "}
                      <span className="font-semibold">{product.condition}</span>
                    </div>

                    <div>
                      Product Location:{" "}
                      <span className="font-semibold">{product.location}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bottom rules */}
              <div className="mt-6 space-y-5">
                {/* Bid Rules */}
                <div>
                  <h3 className="text-sm font-semibold text-[#325082] mb-2">
                    Bid Rules
                  </h3>

                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                    <li>Only bid if you truly intend to buy the item.</li>
                    <li>
                      If you win, payment must be completed within the given
                      time.
                    </li>
                    <li>
                      If payment is not completed, the order will be cancelled
                      automatically.
                    </li>
                    <li>
                      Repeated non-payment or fake bidding may lead to warning,
                      restriction, or ban by admin.
                    </li>
                  </ul>
                </div>

                {/* What happens next */}
                <div>
                  <h3 className="text-sm font-semibold text-[#325082] mb-2">
                    What happens next
                  </h3>

                  <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                    <li>
                      Please make a payment within the given time if seller
                      selected you as a winner.
                    </li>

                    <li>
                      If you cancel the order after payment,
                      <span className="font-medium text-[#325082]">
                        {" "}
                        5% of the payment{" "}
                      </span>
                      will be charged as a platform fee.
                    </li>

                    <li>
                      After payment, arrange delivery via fulfillment chat in
                      Order Details.
                    </li>

                    <li>
                      Seller delivers or meets you; you confirm you’ve received
                      the item.
                    </li>

                    <li>
                      After confirmation, TrustLoop releases the payout to the
                      seller.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right form + bid info */}
            <div className="w-full lg:w-[460px] space-y-4">
              <div className="rounded-[5px] border border-gray-300 shadow-md overflow-hidden">
                <div className="p-3 bg-gradient-to-br from-[#f3f6fb] to-white">
                  <h3 className="font-semibold text-[#325082]">
                    Submit Your Bid
                  </h3>
                </div>

                <form id="auctionBidForm" className="px-4 py-2 space-y-4">
                  {/* Bid summary */}
                  <div className="rounded-[5px] border border-[#dbe6ff] bg-[#f8fbff] p-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Base price</span>
                      <span className="font-semibold text-[#1f2f4c]">
                        ฿{Number(product.startingPrice || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current highest</span>
                      <span className="font-semibold text-[#1f2f4c]">
                        ฿{currentHighest.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#325082] font-medium">
                        Minimum next bid
                      </span>
                      <span className="font-bold text-[#325082]">
                        ฿{minBid.toLocaleString()}
                      </span>
                    </div>

                    {endsAt && (
                      <div className="pt-2 border-t border-[#dbe6ff] text-[13px] text-rose-700">
                        <span className="font-medium">Ends:</span>{" "}
                        <span className="font-semibold">{fmtBKK(endsAt)}</span>{" "}
                        <span className="font-semibold">
                          (<DeadlineCountdown target={endsAt} prefix="" /> left)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Main input */}
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
                      defaultValue={minBid}
                      className="w-full rounded-[5px] border border-[#dbe6ff] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#325082]/30"
                    />
                    <p className="text-xs text-gray-600 ml-1 mt-1">
                      Minimum next bid is ฿{minBid.toLocaleString()}.
                    </p>
                  </div>

                  {/* Short pricing rules */}
                  <div className="rounded-[5px] bg-[#f9fbff] border border-gray-200 p-3">
                    <h4 className="text-xs font-semibold text-[#325082] mb-2">
                      Quick Bid Rules
                    </h4>
                    <ul className="text-xs text-gray-700 list-disc pl-5 space-y-1">
                      <li>
                        First bid must be at least 5% above the base price.
                      </li>
                      <li>
                        Each next bid must be at least 5% above the current
                        highest bid.
                      </li>
                      <li>Bids after the deadline will not be accepted.</li>
                    </ul>
                  </div>

                  <div className="mt-2">
                    <ConfirmBidButton
                      productId={String(product._id)}
                      formId="auctionBidForm"
                      minBid={minBid}
                    />
                  </div>

                  <p className="text-xs text-center text-gray-600 -mt-1 leading-relaxed">
                    By placing a bid, you agree to proceed with payment later if
                    you win.
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
