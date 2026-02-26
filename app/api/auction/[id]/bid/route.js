// app/api/auction/[id]/bid/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
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

    if (product.type !== "auction") {
      return new Response("Not an auction product.", { status: 400 });
    }

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
    if (base < 1000) {
      return new Response("Auction base price must be at least ฿1,000.", {
        status: 409,
      });
    }

    const lastAmount = Number(product.currentBid?.amount) || 0;
    const lastBidderId = product.currentBid?.bidder
      ? String(product.currentBid.bidder)
      : "";

    // ✅ Fix #3: block same bidder twice in a row
    if (lastBidderId && String(me._id) === lastBidderId) {
      return new Response(
        "You are already the highest bidder. Wait for another bidder before bidding again.",
        { status: 409 },
      );
    }

    // ✅ Fix #4: increment is ALWAYS 5% of base
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

    // ✅ atomic update: also ensure currentBidder isn't me (prevents race)
    const updated = await Product.findOneAndUpdate(
      {
        _id: product._id,
        type: "auction",
        isAvailable: true,
        isHidden: { $ne: true },
        auctionEndsAt: { $gt: new Date() },

        // ensure bid is still valid at DB time
        $or: [
          { "currentBid.amount": { $exists: false } },
          { "currentBid.amount": { $lt: bidAmount } },
        ],

        // ensure not same bidder at DB time
        $or: [
          { "currentBid.bidder": { $exists: false } },
          { "currentBid.bidder": { $ne: me._id } },
        ],
      },
      {
        $set: {
          currentBid: { amount: bidAmount, bidder: me._id },
        },
        $push: {
          bidHistory: { bidder: me._id, amount: bidAmount, time: new Date() },
        },
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
