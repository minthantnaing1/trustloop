// app/api/auction/[id]/accept-highest/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import User from "@/models/User";
import { startAuctionPayment } from "@/lib/auctionFlow";

export async function POST(_req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const { id } = await params;
    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });
    if (product.type !== "auction")
      return new Response("Not an auction product.", { status: 400 });

    if (product.owner?.email !== session.user.email) {
      return new Response("Unauthorized", { status: 403 });
    }

    const auction = await Auction.findOne({ product: product._id });
    if (!auction)
      return new Response("Auction record not found.", { status: 404 });

    // already locked/closed
    if (auction.status === "AWAITING_PAYMENT" || auction.status === "SOLD") {
      return new Response("Auction already closed.", { status: 409 });
    }

    // optional: block if ended time passed (your rule)
    const endsAt = product.auctionEndsAt
      ? new Date(product.auctionEndsAt)
      : null;
    if (endsAt && endsAt.getTime() <= Date.now()) {
      return new Response("Auction already ended.", { status: 409 });
    }

    if (!auction.currentBid?.amount || !auction.currentBid?.bidder) {
      return new Response("No bids yet to accept.", { status: 409 });
    }

    const me = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();

    const out = await startAuctionPayment(product._id, {
      actorUserId: me?._id,
      reason: "SELLER_ACCEPT",
    });

    return Response.json({
      ok: true,
      transactionId: out?.txn?._id?.toString?.() || String(out?.txn?._id),
    });
  } catch (e) {
    console.error("❌ accept-highest error:", e);
    return new Response(e?.message || "Server Error", { status: 500 });
  }
}
