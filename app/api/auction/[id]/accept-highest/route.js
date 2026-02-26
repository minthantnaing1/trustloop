// app/api/auction/[id]/accept-highest/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { startAuctionPayment } from "@/lib/auctionFlow";

export async function POST(_req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.type !== "auction") {
      return new Response("Not an auction product.", { status: 400 });
    }

    if (product.owner?.email !== session.user.email) {
      return new Response("Unauthorized", { status: 403 });
    }

    // If already closed (we use auctionResolution to decide too)
    if (
      product.isAvailable === false ||
      product?.auctionResolution?.status === "AWAITING_PAYMENT"
    ) {
      return new Response("Auction already closed.", { status: 409 });
    }

    const endsAt = product.auctionEndsAt
      ? new Date(product.auctionEndsAt)
      : null;
    if (endsAt && endsAt.getTime() <= Date.now()) {
      // If you want: allow accepting after end; for now keep your rule:
      return new Response("Auction already ended.", { status: 409 });
    }

    if (!product.currentBid?.amount || !product.currentBid?.bidder) {
      return new Response("No bids yet to accept.", { status: 409 });
    }

    // Actor (seller) id for timeline
    const me = await User.findOne({ email: session.user.email })
      .select("_id")
      .lean();

    // ✅ Close + create transaction for highest bidder (24h payment window)
    const out = await startAuctionPayment(product._id, {
      actorUserId: me?._id,
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
