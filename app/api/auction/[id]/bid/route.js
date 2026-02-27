// app/api/auction/[id]/bid/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import User from "@/models/User";

function ceilBaht(n) {
  return Math.ceil(Number(n) || 0);
}

export async function POST(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const { amount } = await req.json();

    const bidAmount = Number(amount);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return new Response("Invalid bid amount.", { status: 400 });
    }

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("Unauthorized", { status: 401 });

    const product = await Product.findById(id).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });
    if (product.type !== "auction")
      return new Response("Not an auction product.", { status: 400 });

    if (String(product.owner?._id) === String(me._id)) {
      return new Response("You cannot bid on your own auction.", {
        status: 403,
      });
    }

    if (product.isHidden) {
      return new Response("This auction is not available.", { status: 409 });
    }

    if (product.isAvailable === false) {
      return new Response("This auction is no longer available.", {
        status: 409,
      });
    }

    const endsAt = product.auctionEndsAt
      ? new Date(product.auctionEndsAt)
      : null;
    if (!endsAt || Number.isNaN(endsAt.getTime())) {
      return new Response("Auction deadline is missing.", { status: 409 });
    }
    if (endsAt.getTime() <= Date.now()) {
      return new Response("Auction has ended. Bidding is closed.", {
        status: 409,
      });
    }

    const base = Number(product.startingPrice) || 0;
    if (base < 10) {
      return new Response("Auction base price must be at least ฿1,000.", {
        status: 409,
      });
    }

    // Ensure Auction exists (created when posting)
    const auction = await Auction.findOne({ product: product._id }).select(
      "status currentBid bidHistory endsAt startingPrice seller",
    );
    if (!auction)
      return new Response("Auction record not found.", { status: 409 });

    if (auction.status !== "OPEN") {
      return new Response("This auction is not accepting bids right now.", {
        status: 409,
      });
    }

    // Prevent same bidder twice in a row
    const lastBidderId = auction.currentBid?.bidder
      ? String(auction.currentBid.bidder)
      : "";
    if (lastBidderId && String(me._id) === lastBidderId) {
      return new Response(
        "You are already the highest bidder. Wait for another bidder before bidding again.",
        { status: 409 },
      );
    }

    // min increment ALWAYS 5% of base
    const lastAmount = Number(auction.currentBid?.amount) || 0;
    const inc = ceilBaht(base * 0.05);
    const ref = lastAmount > 0 ? lastAmount : base;
    const minAllowed = ceilBaht(ref + inc);

    if (bidAmount < minAllowed) {
      return new Response(
        `Bid too low. Minimum allowed is ฿${minAllowed.toLocaleString()}.`,
        { status: 409 },
      );
    }

    if (lastAmount > 0 && bidAmount <= lastAmount) {
      return new Response("Bid must be higher than current highest bid.", {
        status: 409,
      });
    }

    // ✅ atomic update against races
    const updated = await Auction.findOneAndUpdate(
      {
        product: product._id,
        status: "OPEN",
        endsAt: { $gt: new Date() },
        $and: [
          {
            $or: [
              { "currentBid.amount": { $exists: false } },
              { "currentBid.amount": { $lt: bidAmount } },
            ],
          },
          {
            $or: [
              { "currentBid.bidder": { $exists: false } },
              { "currentBid.bidder": { $ne: me._id } },
            ],
          },
        ],
      },
      {
        $set: {
          currentBid: { amount: bidAmount, bidder: me._id, time: new Date() },
        },
        $push: {
          bidHistory: { bidder: me._id, amount: bidAmount, time: new Date() },
        },
        $inc: { version: 1 },
      },
      { new: true },
    );

    if (!updated) {
      return new Response(
        "Bid rejected. Someone may have placed a bid just now — please refresh and try again.",
        { status: 409 },
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error("❌ auction bid POST error:", e);
    return new Response("Server Error", { status: 500 });
  }
}
