// models/Transaction.js
import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: [
      "PENDING_UPLOAD",
      "AWAITING_ADMIN_REVIEW",
      "ESCROW_FUNDED",
      "DELIVERY_IN_PROGRESS",
      "BUYER_CONFIRMED",
      "PAID_OUT",
      "CANCELLED",
      "REJECTED",
    ],
    default: "PENDING_UPLOAD",
    index: true,
  },

  // money
  price: { type: Number, required: true },
  fee: { type: Number, required: true },
  total: { type: Number, required: true },
  sellerNet: { type: Number, required: true },

  // timing / proofs
  expiresAt: { type: Date }, // 5-min deadline for upload

  // 🔽 NEW: store Cloudinary URL (preferred) + optional publicId (for deletions)
  buyerReceiptUrl: { type: String, default: "" },
  buyerReceiptPublicId: { type: String, default: "" },

  // 🔽 LEGACY: keep base64 for old records, but hide by default so it won't bloat responses
  buyerPaymentReceiptB64: { type: String, select: false },

  // payout proof uploaded by admin (can also move this to Cloudinary if not already)
  adminPayoutReceiptUrl: String,

  // logistics (optional)
  shippingCarrier: String,
  trackingNumber: String,
  meetupLocation: String,
  deliveryNote: String,

  // audit
  timeline: [
    {
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: String, // e.g., "BUYER_UPLOADED_RECEIPT", "ADMIN_VERIFIED_PAYMENT"
      meta: Object,
    },
  ],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
});

// keep updatedAt fresh
TransactionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Prevent multiple *active* transactions for the same buyer+product
TransactionSchema.index(
  { product: 1, buyer: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "PENDING_UPLOAD",
          "AWAITING_ADMIN_REVIEW",
          "ESCROW_FUNDED",
          "DELIVERY_IN_PROGRESS",
          "BUYER_CONFIRMED",
        ],
      },
    },
  }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
