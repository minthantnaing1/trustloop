import mongoose from "mongoose";

const BidSchema = new mongoose.Schema(
  {
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    time: { type: Date, default: Date.now },
  },
  { _id: false },
);

const QueueItemSchema = new mongoose.Schema(
  {
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    time: { type: Date },
  },
  { _id: false },
);

const AuctionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true, // one auction per product
      index: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // State
    status: {
      type: String,
      enum: [
        "OPEN", // accepting bids
        "ENDED", // time ended, queue prepared
        "AWAITING_PAYMENT", // waiting for current winner payment
        "SOLD", // payment done
        "UNSUCCESSFUL", // nobody paid / no valid bids
      ],
      default: "OPEN",
      index: true,
    },

    // Cached from Product (optional but convenient for performance)
    startingPrice: { type: Number, required: true },
    endsAt: { type: Date, required: true, index: true },

    // Bidding
    currentBid: {
      amount: { type: Number, default: 0 },
      bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      time: { type: Date },
    },

    bidHistory: { type: [BidSchema], default: [] },

    // Resolution (winner rotation)
    queue: { type: [QueueItemSchema], default: [] }, // unique bidders, sorted high->low
    currentIndex: { type: Number, default: 0 },

    // Payment tracking
    currentTxn: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    paymentExpiresAt: { type: Date },

    // Final result
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    finalPrice: { type: Number, default: 0 },
    soldAt: { type: Date },
    closedAt: { type: Date },

    // Safety / concurrency
    version: { type: Number, default: 0 }, // you can bump this on critical transitions
  },
  { timestamps: true },
);

// Helpful indexes
AuctionSchema.index({ status: 1, endsAt: 1 });
AuctionSchema.index({ "currentBid.amount": -1 });

export default mongoose.models.Auction ||
  mongoose.model("Auction", AuctionSchema);
