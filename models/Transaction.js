import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const DeliverySchema = new mongoose.Schema(
  {
    // Buyer selects at checkout (we log changes in timeline)
    method: {
      type: String,
      enum: ["DELIVERY", "MEETUP"],
      required: true,
      index: true,
    },

    // ---- DELIVERY FIELDS ----
    address: { type: String, default: "" }, // buyer's entered address
    carrier: { type: String, default: "" }, // seller sets after accept
    tracking: { type: String, default: "" }, // seller sets after ship
    scheduledAt: { type: Date }, // ETA / ship time

    // ---- MEETUP FIELDS ----
    meetupLocation: { type: String, default: "" },
    meetupProposedAt: { type: Date },
    meetupProposedBy: { type: ObjectId, ref: "User" },
    meetupAgreedAt: { type: Date },
    meetupScheduledAt: { type: Date },

    // Common notes
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const TimelineEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: "User" },
    action: String, // e.g., "BUYER_CREATED_TXN", "SELLER_SET_DELIVERY", "MEETUP_PROPOSED", "MEETUP_ACCEPTED"
    meta: Object,
  },
  { _id: false }
);

const TransactionSchema = new mongoose.Schema({
  product: { type: ObjectId, ref: "Product", required: true },
  seller: { type: ObjectId, ref: "User", required: true },
  buyer: { type: ObjectId, ref: "User", required: true },

  // Distinguish donation vs buy/sell without relying on product later
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
      "ESCROW_FUNDED",
      "AWAITING_DONOR", // added for donation flow
      "SELLER_ACCEPTED",
      "DELIVERY_IN_PROGRESS",
      "SELLER_DELIVERED",
      "MEETUP_COMPLETED",
      "BUYER_CONFIRMED",
      "PAID_OUT",
      "CANCELLED_BY_BUYER",
      "CANCELLED_BY_SELLER",
      "REJECTED_BY_ADMIN",
    ],
    default: "PENDING_PAYMENT",
    index: true,
  },

  // Money (for donation, all zero)
  price: { type: Number, required: true },
  fee: { type: Number, required: true },
  total: { type: Number, required: true },
  sellerNet: { type: Number, required: true },

  // Deadlines / proofs
  expiresAt: { type: Date }, // e.g., upload deadline
  buyerReceiptUrl: { type: String, default: "" }, // Cloudinary URL
  adminPayoutReceiptUrl: { type: String, default: "" },

  // Unified fulfillment object
  fulfillment: { type: DeliverySchema, required: true },

  // Optional cancellations / rejections
  cancelledBy: { type: ObjectId, ref: "User" },
  cancelReason: { type: String, default: "" },
  adminRejectReason: { type: String, default: "" },
  requestReason: { type: String, default: "" },

  // Audit
  timeline: [TimelineEventSchema],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },

  autoConfirmAt: { type: Date },
  reviewed: { type: Boolean, default: false },
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
          "PENDING_UPLOAD",
          "AWAITING_ADMIN_REVIEW",
          "ESCROW_FUNDED",
          "AWAITING_DONOR", // include donation’s active state
          "SELLER_ACCEPTED",
          "DELIVERY_IN_PROGRESS",
          "SELLER_DELIVERED",
          "MEETUP_COMPLETED",
          "BUYER_CONFIRMED",
        ],
      },
    },
  }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
