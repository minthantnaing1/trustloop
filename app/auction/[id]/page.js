// app/auction/[id]/page.js
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Auction from "@/models/Auction";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import AuctionDetails from "@/components/AuctionDetails";
import { autoAcceptIfDeadlinePassed } from "@/lib/auctionFlow";

export const dynamic = "force-dynamic";

export default async function AuctionProductPage({ params }) {
  const { id } = await params;

  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  await connectDB();

  const product = await Product.findById(id).populate("owner").lean();

  if (!product) {
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

  let sellerSoldCount = 0;

  if (product?.owner?._id) {
    sellerSoldCount = await Transaction.countDocuments({
      seller: product.owner._id,
      status: "PAID_OUT",
      kind: { $in: ["BUY_SELL", "AUCTION"] },
    });
  }

  if (product.type && product.type !== "auction") {
    return redirect(`/${product.type}/${product._id}`);
  }

  const isOwner = sessionEmail && sessionEmail === product.owner?.email;

  if (product.isHidden && !isOwner) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="min-h-[calc(100vh-210px)] flex items-center justify-center">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">🙈</div>
              <h1 className="text-xl font-semibold text-[#1f2d4d]">
                This Auction is hidden.
              </h1>
              <p className="mt-1 text-slate-600">
                The owner has hidden this auction from public view.
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

  // Runs when this page is requested.
  // This is NOT a background scheduler; it finalizes when a request hits this auction.
  await autoAcceptIfDeadlinePassed(product._id, { actorUserId: null });

  const auction = await Auction.findOne({ product: product._id })
    .populate({ path: "currentBid.bidder", select: "name email image" })
    .populate({ path: "bidHistory.bidder", select: "name email image" })
    .populate({ path: "winner", select: "name email image" })
    .lean();

  if (!auction) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="min-h-[calc(100vh-210px)] flex items-center justify-center">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h1 className="text-xl font-semibold text-[#1f2d4d]">
                Auction engine data missing
              </h1>
              <p className="mt-1 text-slate-600">
                This auction post exists, but bidding data was not found.
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

  const missing = [];
  if (!me?.phone) missing.push("Phone");
  if (!me?.location) missing.push("Location");

  const bidGuard = { ok: missing.length === 0, missing };

  const productPlain = JSON.parse(JSON.stringify(product));
  const auctionPlain = JSON.parse(JSON.stringify(auction));

  if (productPlain?.owner) {
    productPlain.owner.soldCount = sellerSoldCount;
  }

  return (
    <AuctionDetails
      product={productPlain}
      auction={auctionPlain}
      sessionEmail={sessionEmail}
      initialIsFav={initialIsFav}
      isOwner={isOwner}
      guard={bidGuard}
    />
  );
}
