// lib/auctionFlow.js
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

const AUCTION_PAY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function uniqueQueueFromBidHistory(bidHistory = []) {
  // Sort high -> low, then older first for same amount (fair)
  const sorted = [...bidHistory].sort((a, b) => {
    const da = new Date(a.time || 0).getTime();
    const db = new Date(b.time || 0).getTime();
    if (Number(b.amount || 0) !== Number(a.amount || 0)) {
      return Number(b.amount || 0) - Number(a.amount || 0);
    }
    return da - db;
  });

  const seen = new Set();
  const queue = [];

  for (const b of sorted) {
    const id = String(b?.bidder || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    queue.push({
      bidder: b.bidder,
      amount: Number(b.amount || 0),
      time: b.time ? new Date(b.time) : undefined,
    });
  }

  return queue;
}

export async function startAuctionPayment(productId, { actorUserId } = {}) {
  await connectDB();

  const product = await Product.findById(productId).populate("owner");
  if (!product) throw new Error("Product not found");
  if (product.type !== "auction") throw new Error("Not an auction product");

  const queue = uniqueQueueFromBidHistory(product.bidHistory || []);
  if (!queue.length) throw new Error("No bids yet to accept");

  // Create txn for highest
  const top = queue[0];
  const buyerUser = await User.findById(top.bidder).lean();
  if (!buyerUser) throw new Error("Winner user not found");

  const amount = Number(top.amount || 0);
  const fee = Math.round(amount * 0.05);
  const total = amount;
  const sellerNet = amount - fee;

  const expiresAt = new Date(Date.now() + AUCTION_PAY_WINDOW_MS);

  const txn = await Transaction.create({
    product: product._id,
    seller: product.owner._id,
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

    // optional debug fields (safe even if not in schema; mongoose ignores if strict=true)
    auctionBidAmount: amount,
    auctionQueueIndex: 0,

    timeline: [
      {
        at: new Date(),
        by: actorUserId || product.owner._id,
        action: "AUCTION_WINNER_ASSIGNED",
        meta: { idx: 0, amount, expiresAt },
      },
    ],
  });

  // Close auction + mark awaiting payment
  product.isAvailable = false;
  product.auctionEndsAt = new Date();

  product.auctionResolution = {
    status: "AWAITING_PAYMENT",
    queue,
    currentIndex: 0,
    currentTxn: txn._id,
    paymentExpiresAt: expiresAt,
    closedAt: new Date(),
  };

  await product.save();
  return { product, txn };
}

export async function autoAcceptIfDeadlinePassed(
  productId,
  { actorUserId } = {},
) {
  await connectDB();

  const now = new Date();

  // get fresh product
  const product = await Product.findById(productId).populate("owner");
  if (!product) return { ok: false, reason: "not_found" };
  if (product.type !== "auction") return { ok: false, reason: "not_auction" };

  const endsAt = product.auctionEndsAt ? new Date(product.auctionEndsAt) : null;
  const ended =
    endsAt &&
    !Number.isNaN(endsAt.getTime()) &&
    endsAt.getTime() <= now.getTime();

  // not ended yet -> do nothing
  if (!ended) return { ok: true, didFinalize: false };

  // already accepted/closed -> do nothing
  if (
    product.isAvailable === false ||
    product?.auctionResolution?.status === "AWAITING_PAYMENT"
  ) {
    return { ok: true, didFinalize: false, alreadyFinalized: true };
  }

  // ✅ prefer bidHistory (source of truth), not currentBid
  if (!Array.isArray(product.bidHistory) || product.bidHistory.length === 0) {
    return { ok: true, didFinalize: false, noBids: true };
  }

  // ✅ IMPORTANT: atomic claim so it won’t create duplicate transactions
  // also block FINALIZING so it can't be claimed twice
  const claim = await Product.updateOne(
    {
      _id: product._id,
      type: "auction",
      isAvailable: true,
      auctionEndsAt: { $lte: now },
      $or: [
        { "auctionResolution.status": { $exists: false } },
        {
          "auctionResolution.status": {
            $nin: ["AWAITING_PAYMENT", "FINALIZING"],
          },
        },
      ],
    },
    {
      $set: {
        "auctionResolution.status": "FINALIZING",
        "auctionResolution.closedAt": now,
      },
    },
  );

  // someone else finalized just now
  if (claim.modifiedCount === 0) {
    return { ok: true, didFinalize: false, alreadyFinalized: true };
  }

  // ✅ Now create the real transaction exactly like seller accept
  try {
    const out = await startAuctionPayment(product._id, { actorUserId });

    return {
      ok: true,
      didFinalize: true,
      transactionId: out?.txn?._id?.toString?.() || String(out?.txn?._id),
    };
  } catch (e) {
    // ✅ do not leave the auction stuck in FINALIZING forever
    await Product.updateOne(
      { _id: product._id, "auctionResolution.status": "FINALIZING" },
      {
        $set: {
          "auctionResolution.status": "UNRESOLVED",
        },
      },
    );
    throw e;
  }
}

export async function advanceAuctionWinner(
  productId,
  previousTxnId,
  { actorUserId } = {},
) {
  await connectDB();

  const product = await Product.findById(productId).populate("owner");
  if (!product) return null;
  if (product.type !== "auction") return null;

  const r = product.auctionResolution || {};
  const queue =
    Array.isArray(r.queue) && r.queue.length
      ? r.queue
      : uniqueQueueFromBidHistory(product.bidHistory || []);

  if (!queue.length) {
    product.auctionResolution = {
      status: "UNSUCCESSFUL",
      queue: [],
      currentIndex: 0,
      currentTxn: null,
      paymentExpiresAt: null,
      closedAt: r.closedAt || new Date(),
    };
    await product.save();
    return { ok: true, status: "UNSUCCESSFUL" };
  }

  const nextIndex = Number(r.currentIndex || 0) + 1;

  if (nextIndex >= queue.length) {
    product.auctionResolution = {
      status: "UNSUCCESSFUL",
      queue,
      currentIndex: nextIndex,
      currentTxn: null,
      paymentExpiresAt: null,
      closedAt: r.closedAt || new Date(),
    };
    await product.save();
    return { ok: true, status: "UNSUCCESSFUL" };
  }

  const next = queue[nextIndex];
  const buyerUser = await User.findById(next.bidder).lean();

  // If user missing, skip forward once
  if (!buyerUser) {
    product.auctionResolution = { ...r, queue, currentIndex: nextIndex };
    await product.save();
    return advanceAuctionWinner(productId, previousTxnId, { actorUserId });
  }

  const amount = Number(next.amount || 0);
  const fee = Math.round(amount * 0.05);
  const total = amount;
  const sellerNet = amount - fee;
  const expiresAt = new Date(Date.now() + AUCTION_PAY_WINDOW_MS);

  const txn = await Transaction.create({
    product: product._id,
    seller: product.owner._id,
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
    auctionQueueIndex: nextIndex,
    timeline: [
      {
        at: new Date(),
        by: actorUserId || product.owner._id,
        action: "AUCTION_WINNER_ADVANCED",
        meta: {
          idx: nextIndex,
          amount,
          expiresAt,
          previousTxnId: previousTxnId || "",
        },
      },
    ],
  });

  product.auctionResolution = {
    status: "AWAITING_PAYMENT",
    queue,
    currentIndex: nextIndex,
    currentTxn: txn._id,
    paymentExpiresAt: expiresAt,
    closedAt: r.closedAt || new Date(),
  };

  await product.save();
  return { ok: true, status: "AWAITING_PAYMENT", txnId: txn._id };
}
