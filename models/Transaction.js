import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const TimelineEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: "User" },
    action: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { _id: false },
);

const TransactionSchema = new mongoose.Schema({
  // Relations
  product: { type: ObjectId, ref: "Product", required: true, index: true },
  seller: { type: ObjectId, ref: "User", required: true, index: true },
  buyer: { type: ObjectId, ref: "User", required: true, index: true },

  // Type
  kind: {
    type: String,
    enum: ["BUY_SELL", "DONATION", "AUCTION"],
    default: "BUY_SELL",
    index: true,
  },

  status: {
    type: String,
    enum: [
      "PENDING_PAYMENT",
      "PAYMENT_SUCCESSFUL",
      "AWAITING_DONOR",
      "SELLER_ACCEPTED",
      "DELIVERY_IN_PROGRESS",

      // ✅ NEW: seller uploaded proof, countdown starts
      "SELLER_PROOF_UPLOADED",

      "BUYER_CONFIRMED",
      "PAID_OUT",
      "CANCELLED_BY_BUYER",
      "CANCELLED_BY_SELLER",
      "REJECTED_BY_ADMIN",
    ],
    default: "PENDING_PAYMENT",
    index: true,
  },

  // Money (donation can be zeros)
  price: { type: Number, required: true, default: 0 },
  fee: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
  sellerNet: { type: Number, required: true, default: 0 },

  // ✅ Buyer-provided location (since no fulfillment)
  buyerLocation: { type: String, default: "" },

  // Deadlines / proofs
  expiresAt: { type: Date },
  buyerReceiptUrl: { type: String, default: "" }, // payment slip
  adminPayoutReceiptUrl: { type: String, default: "" }, // admin payout proof (if any)

  // ✅ Seller proof (image URLs) + auto confirm
  sellerProofUrls: { type: [String], default: [] },
  sellerProofUploadedAt: { type: Date },
  autoConfirmAt: { type: Date },

  // Admin / routing fields (keep if you already use these)
  payAdmin: { type: ObjectId, ref: "User" }, // round-robin admin

  // Cancellation / rejection notes
  cancelledBy: { type: ObjectId, ref: "User" },
  cancelReason: { type: String, default: "" },
  adminRejectReason: { type: String, default: "" },
  requestReason: { type: String, default: "" },

  // Audit
  timeline: { type: [TimelineEventSchema], default: [] },

  // Chat summary (fast UI)
  lastMessageAt: { type: Date },
  lastMessageText: { type: String, default: "" },

  reviewed: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// keep updatedAt fresh
TransactionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Prevent multiple active transactions for the same buyer+product
TransactionSchema.index(
  { product: 1, buyer: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "PENDING_PAYMENT",
          "PAYMENT_SUCCESSFUL",
          "AWAITING_DONOR",
          "SELLER_ACCEPTED",
          "DELIVERY_IN_PROGRESS",
          "SELLER_PROOF_UPLOADED",
          "BUYER_CONFIRMED",
        ],
      },
    },
  },
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
