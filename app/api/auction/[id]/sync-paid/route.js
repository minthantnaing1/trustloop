// app/api/auction/[id]/sync-paid/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import Transaction from "@/models/Transaction";

export async function POST(_req, { params }) {
  try {
    const { id } = await params; // product id
    await connectDB();

    const product = await Product.findById(id).select("_id type").lean();
    if (!product) return new Response("Product not found", { status: 404 });
    if (product.type !== "auction")
      return new Response("Not an auction product", { status: 400 });

    // Find auction doc
    const auction = await Auction.findOne({ product: product._id }).lean();
    if (!auction) return new Response("Auction not found", { status: 404 });

    // If already SOLD, nothing to do
    if (auction.status === "SOLD") {
      return Response.json({ ok: true, alreadySold: true });
    }

    // ✅ Find the most relevant AUCTION transaction for this product
    // Priority:
    // 1) currentTxn on auction if present
    // 2) else latest successful AUCTION txn
    let txn = null;

    if (auction.currentTxn) {
      txn = await Transaction.findById(auction.currentTxn).lean();
    }

    if (!txn) {
      txn = await Transaction.findOne({
        product: product._id,
        kind: "AUCTION",
        hasPaymentSucceeded: true,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }

    if (!txn) {
      return Response.json({ ok: true, paid: false, reason: "no_paid_txn" });
    }

    // Your “isPayment” field = hasPaymentSucceeded
    const paid =
      txn.hasPaymentSucceeded === true || txn.status === "PAYMENT_SUCCESSFUL";
    if (!paid) {
      return Response.json({ ok: true, paid: false, reason: "txn_not_paid" });
    }

    const now = new Date();

    // ✅ Mark Auction SOLD (idempotent)
    const auctionUpd = await Auction.updateOne(
      { _id: auction._id, status: { $ne: "SOLD" } },
      {
        $set: {
          status: "SOLD",
          soldAt: now,
          closedAt: now,
          currentTxn: txn._id,
          winner: txn.buyer,
          finalPrice: Number(txn.auctionBidAmount || txn.total || 0),
          paymentExpiresAt: null,
        },
        $inc: { version: 1 },
      },
    );

    // ✅ Mark Product SOLD (idempotent)
    const productUpd = await Product.updateOne(
      { _id: product._id },
      { $set: { isAvailable: false, auctionStatus: "SOLD" } },
    );

    return Response.json({
      ok: true,
      paid: true,
      auctionMatched: auctionUpd.matchedCount,
      auctionModified: auctionUpd.modifiedCount,
      productMatched: productUpd.matchedCount,
      productModified: productUpd.modifiedCount,
      transactionId: String(txn._id),
    });
  } catch (e) {
    console.error("❌ sync-paid error:", e);
    return new Response(e?.message || "Server Error", { status: 500 });
  }
}
