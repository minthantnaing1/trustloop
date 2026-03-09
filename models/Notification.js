// models/Notification.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const NotificationEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: String,
    title: String,
    message: String,
    meta: { type: Object, default: {} },
  },
  { _id: false },
);

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: ObjectId, ref: "User", index: true, required: true }, // who sees it
    actor: { type: ObjectId, ref: "User" }, // who triggered it (buyer/seller/admin)

    transaction: {
      type: ObjectId,
      ref: "Transaction",
      index: true,
      required: true,
    },
    product: { type: ObjectId, ref: "Product" },

    // Keep your original "latest" fields for easy list view
    type: {
      type: String,
      enum: [
        "ORDER_CREATED",
        "STRIPE_PAYMENT_CONFIRMED",
        "PAYMENT_FAILED",
        "STRIPE_FEE_RECORDED",
        "SELLER_ACCEPTED",
        "CHAT_STARTED",
        "SELLER_PROOF_UPLOADED",
        "BUYER_CONFIRMED",
        "AUTO_CONFIRMED_AFTER_3_DAYS",
        "ADMIN_PAID_OUT",
        "ADMIN_REFUNDED_BUYER",
        "CANCELLED_BY_BUYER",
        "CANCELLED_BY_SELLER",
        "AUTO_CANCELLED_EXPIRED",
        "ADMIN_STATUS_OVERRIDE",
        "AUCTION_WINNER_ASSIGNED",
        "AUCTION_WINNER_ASSIGNED_AUTO",
        "AUCTION_WINNER_ADVANCED",
        "AUCTION_UNSUCCESSFUL",
        "AUCTION_UNSUCCESSFUL_NO_BIDS",
        "AUCTION_ALL_BIDDERS_FAILED",
      ],
      required: true,
      index: true,
    },

    title: { type: String, required: true },
    message: { type: String, default: "" },

    link: { type: String, default: "" }, // e.g. `/my-orders/:id` or `/admin/transactions/:id`
    meta: { type: Object, default: {} },

    // Grouped history (all timeline notifications for this txn+recipient)
    events: { type: [NotificationEventSchema], default: [] },

    // Read-state is now per (txn, recipient)
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },

    // ✅ auto delete after 30 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

// Latest-first list + uniqueness per (recipient, transaction)
NotificationSchema.index({ recipient: 1, updatedAt: -1 });
NotificationSchema.index({ recipient: 1, transaction: 1 }, { unique: true });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
