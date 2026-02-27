// lib/auctionFlow.js
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Auction from "@/models/Auction";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

// const AUCTION_PAY_WINDOW_MS = 24 * 60 * 60 * 1000; // ✅ 24 hours
const AUCTION_PAY_WINDOW_MS = 2 * 60 * 1000; // ✅ 24 hours

function uniqueQueueFromBidHistory(bidHistory = []) {
  const sorted = [...bidHistory].sort((a, b) => {
    const da = new Date(a.time || 0).getTime();
    const db = new Date(b.time || 0).getTime();
    if (Number(b.amount || 0) !== Number(a.amount || 0)) {
      return Number(b.amount || 0) - Number(a.amount || 0);
    }
    return da - db; // older first for same amount
  });

  const seen = new Set();
  const queue = [];

  for (const b of sorted) {
    const id = String(b?.bidder?._id || b?.bidder || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    queue.push({
      bidder: b.bidder?._id || b.bidder,
      amount: Number(b.amount || 0),
      time: b.time ? new Date(b.time) : undefined,
    });
  }

  return queue;
}

async function markAuctionUnsuccessful(productId, auctionId) {
  const now = new Date();

  await Auction.updateOne(
    { _id: auctionId },
    {
      $set: {
        status: "UNSUCCESSFUL",
        queue: [],
        currentIndex: 0,
        currentTxn: null,
        paymentExpiresAt: null,
        winner: null,
        finalPrice: 0,
        closedAt: now,
      },
      $inc: { version: 1 },
    },
  );

  // per your rule: if no bidder after deadline -> posting unavailable and closed
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        isAvailable: false,
        auctionStatus: "ENDED",
      },
    },
  );

  return { ok: true, status: "UNSUCCESSFUL" };
}

async function createAuctionTxn({
  product,
  auction,
  buyerUser,
  amount,
  idx,
  actorUserId,
  previousTxnId,
  action,
}) {
  const fee = Math.round(amount * 0.05);
  const total = amount;
  const sellerNet = amount - fee;
  const expiresAt = new Date(Date.now() + AUCTION_PAY_WINDOW_MS);

  const txn = await Transaction.create({
    product: product._id,
    seller: auction.seller,
    buyer: buyerUser._id,
    kind: "AUCTION",
    status: "PENDING_PAYMENT",
    price: 0,
    fee,
    total,
    sellerNet,
    expiresAt,
    buyerLocation:
      String(buyerUser.location || "").trim() || "Assumption University",

    auctionBidAmount: amount,
    auctionQueueIndex: idx,

    timeline: [
      {
        at: new Date(),
        by: actorUserId || auction.seller,
        action,
        meta: { idx, amount, expiresAt, previousTxnId: previousTxnId || "" },
      },
    ],
  });

  return { txn, expiresAt };
}

/**
 * ✅ Winner selection entrypoint:
 * - Seller accept before deadline OR auto finalize after deadline both call this.
 * - It is idempotent: if a currentTxn already exists, it returns that.
 * - It is race-safe: only one request can set currentTxn.
 */
export async function startAuctionPayment(
  productId,
  { actorUserId, reason = "SELLER_ACCEPT" } = {},
) {
  await connectDB();

  const product = await Product.findById(productId).populate("owner");
  if (!product) throw new Error("Product not found");
  if (product.type !== "auction") throw new Error("Not an auction product");

  // Always read latest auction state
  let auction = await Auction.findOne({ product: product._id });
  if (!auction) throw new Error("Auction record not found");

  // If already awaiting payment or sold/unsuccessful, do not create new txn
  if (auction.currentTxn) {
    const existingTxn = await Transaction.findById(auction.currentTxn);
    return { product, auction, txn: existingTxn };
  }

  if (!["OPEN", "ENDED"].includes(auction.status)) {
    throw new Error("Auction is not in a payable state");
  }

  const queue = uniqueQueueFromBidHistory(auction.bidHistory || []);
  if (!queue.length) throw new Error("No bids yet to accept");

  const top = queue[0];
  const buyerUser = await User.findById(top.bidder).lean();
  if (!buyerUser) throw new Error("Winner user not found");

  const amount = Number(top.amount || 0);

  // Create txn first, then atomically attach it to auction (guarded by currentTxn: null)
  const { txn, expiresAt } = await createAuctionTxn({
    product,
    auction,
    buyerUser,
    amount,
    idx: 0,
    actorUserId,
    action:
      reason === "AUTO_FINALIZE"
        ? "AUCTION_WINNER_ASSIGNED_AUTO"
        : "AUCTION_WINNER_ASSIGNED",
  });

  const now = new Date();

  const attach = await Auction.updateOne(
    {
      _id: auction._id,
      currentTxn: null, // ✅ prevents duplicates
      status: { $in: ["OPEN", "ENDED"] },
    },
    {
      $set: {
        status: "AWAITING_PAYMENT",
        queue,
        currentIndex: 0,
        currentTxn: txn._id,
        paymentExpiresAt: expiresAt,
        winner: buyerUser._id,
        finalPrice: amount,
        closedAt: now,
      },
      $inc: { version: 1 },
    },
  );

  if (attach.modifiedCount === 0) {
    // Someone else attached a txn first → remove this new txn to avoid orphan
    await Transaction.deleteOne({ _id: txn._id }).catch(() => {});
    auction = await Auction.findById(auction._id);
    const existingTxn = auction?.currentTxn
      ? await Transaction.findById(auction.currentTxn)
      : null;
    return { product, auction, txn: existingTxn };
  }

  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        isAvailable: false,
        auctionStatus: "ENDED", // bidding closed once winner selected
      },
    },
  );

  // refresh auction doc
  auction = await Auction.findById(auction._id);
  return { product, auction, txn };
}

/**
 * ✅ Auto finalize after deadline:
 * - only runs if ended and auction is still OPEN/ENDED with no currentTxn
 * - creates txn + attaches to auction via startAuctionPayment (idempotent)
 */
export async function autoAcceptIfDeadlinePassed(
  productId,
  { actorUserId } = {},
) {
  await connectDB();

  const product = await Product.findById(productId)
    .select("type auctionEndsAt")
    .lean();
  if (!product) return { ok: false, reason: "not_found" };
  if (product.type !== "auction") return { ok: false, reason: "not_auction" };

  const endsAt = product.auctionEndsAt ? new Date(product.auctionEndsAt) : null;
  const now = new Date();
  const ended =
    endsAt &&
    !Number.isNaN(endsAt.getTime()) &&
    endsAt.getTime() <= now.getTime();
  if (!ended) return { ok: true, didFinalize: false };

  const auction = await Auction.findOne({ product: productId });
  if (!auction) return { ok: false, reason: "auction_missing" };

  if (auction.currentTxn) {
    return { ok: true, didFinalize: false, alreadyFinalized: true };
  }

  if (["SOLD", "UNSUCCESSFUL"].includes(auction.status)) {
    return { ok: true, didFinalize: false, alreadyFinalized: true };
  }

  if (!Array.isArray(auction.bidHistory) || auction.bidHistory.length === 0) {
    await markAuctionUnsuccessful(productId, auction._id);
    return { ok: true, didFinalize: true, noBids: true };
  }

  // Mark ENDED (harmless), then attach txn via startAuctionPayment (idempotent)
  await Auction.updateOne(
    { _id: auction._id, status: "OPEN" },
    { $set: { status: "ENDED", closedAt: now }, $inc: { version: 1 } },
  );

  const out = await startAuctionPayment(productId, {
    actorUserId,
    reason: "AUTO_FINALIZE",
  });

  return {
    ok: true,
    didFinalize: true,
    transactionId: out?.txn?._id?.toString?.() || String(out?.txn?._id),
  };
}

/**
 * ✅ Move to next bidder after previous txn expired/cancelled/failed payment.
 * - creates new txn for nextIndex bidder amount
 * - attaches only if currentTxn is still the previousTxnId (prevents races)
 *
 * ✅ IMPORTANT FIX:
 * If currentTxn is NOT previousTxnId, it means someone already advanced.
 * Do NOT compute nextIndex / mark UNSUCCESSFUL.
 */
export async function advanceAuctionWinner(
  productId,
  previousTxnId,
  { actorUserId } = {},
) {
  await connectDB();

  let auction = await Auction.findOne({ product: productId });
  if (!auction) return null;

  // ✅ guard against double-calls
  if (
    previousTxnId &&
    auction.currentTxn &&
    String(auction.currentTxn) !== String(previousTxnId)
  ) {
    return {
      ok: true,
      alreadyAdvanced: true,
      status: auction.status,
      txnId: auction.currentTxn,
      currentIndex: auction.currentIndex,
    };
  }

  const queue =
    Array.isArray(auction.queue) && auction.queue.length
      ? auction.queue
      : uniqueQueueFromBidHistory(auction.bidHistory || []);

  if (!queue.length) {
    await markAuctionUnsuccessful(productId, auction._id);
    return { ok: true, status: "UNSUCCESSFUL" };
  }

  const nextIndex = Number(auction.currentIndex || 0) + 1;

  if (nextIndex >= queue.length) {
    await markAuctionUnsuccessful(productId, auction._id);
    return { ok: true, status: "UNSUCCESSFUL" };
  }

  const next = queue[nextIndex];
  const buyerUser = await User.findById(next.bidder).lean();

  if (!buyerUser) {
    await Auction.updateOne(
      { _id: auction._id },
      { $set: { queue, currentIndex: nextIndex }, $inc: { version: 1 } },
    );
    return advanceAuctionWinner(productId, previousTxnId, { actorUserId });
  }

  const product = await Product.findById(productId).select("_id").lean();
  if (!product) return null;

  const amount = Number(next.amount || 0);
  const { txn, expiresAt } = await createAuctionTxn({
    product,
    auction,
    buyerUser,
    amount,
    idx: nextIndex,
    actorUserId,
    previousTxnId,
    action: "AUCTION_WINNER_ADVANCED",
  });

  const now = new Date();

  // ✅ Attach only if currentTxn is still the previous txn (race safety)
  const attach = await Auction.updateOne(
    { _id: auction._id, currentTxn: previousTxnId },
    {
      $set: {
        status: "AWAITING_PAYMENT",
        queue,
        currentIndex: nextIndex,
        currentTxn: txn._id,
        paymentExpiresAt: expiresAt,
        winner: buyerUser._id,
        finalPrice: amount,
        closedAt: now,
      },
      $inc: { version: 1 },
    },
  );

  if (attach.modifiedCount === 0) {
    // Someone already advanced (or currentTxn changed). Avoid orphan txn.
    await Transaction.deleteOne({ _id: txn._id }).catch(() => {});
    auction = await Auction.findById(auction._id);
    return {
      ok: true,
      status: auction?.status || "UNKNOWN",
      txnId: auction?.currentTxn || null,
      alreadyAdvanced: true,
    };
  }

  await Product.updateOne(
    { _id: productId },
    { $set: { isAvailable: false, auctionStatus: "ENDED" } },
  );

  return { ok: true, status: "AWAITING_PAYMENT", txnId: txn._id };
}
