// app/api/auction/[id]/refresh/route.js
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import { autoAcceptIfDeadlinePassed } from "@/lib/auctionFlow";

export async function POST(_req, { params }) {
  try {
    const { id } = await params;
    await connectDB();

    const product = await Product.findById(id).select("_id type").lean();
    if (!product) return new Response("Product not found", { status: 404 });
    if (product.type !== "auction")
      return new Response("Not an auction product", { status: 400 });

    // ✅ This will auto-select highest bidder after deadline (idempotent)
    await autoAcceptIfDeadlinePassed(product._id, { actorUserId: null });

    const auction = await Auction.findOne({ product: product._id })
      .populate({ path: "currentBid.bidder", select: "name email image" })
      .populate({ path: "bidHistory.bidder", select: "name email image" })
      .populate({ path: "winner", select: "name email image" })
      .lean();

    if (!auction) return new Response("Auction not found", { status: 404 });

    return Response.json({ ok: true, auction });
  } catch (e) {
    console.error("❌ auction refresh error:", e);
    return new Response(e?.message || "Server Error", { status: 500 });
  }
}
