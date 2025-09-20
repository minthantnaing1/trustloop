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
  { _id: false }
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
      enum: Object.keys({
        ORDER_CREATED: 1,
        PAYMENT_WINDOW_STARTED: 1,
        BUYER_UPLOADED_RECEIPT: 1,
        ADMIN_VERIFIED_PAYMENT: 1,
        SELLER_ACCEPTED: 1,
        SELLER_SET_DELIVERY: 1,
        DELIVERY_STARTED: 1,
        SELLER_DELIVERED: 1,
        MEETUP_PROPOSED: 1,
        MEETUP_ACCEPTED: 1,
        MEETUP_COMPLETED: 1,
        BUYER_CONFIRMED: 1,
        AUTO_CONFIRMED: 1,
        AUTO_CONFIRMED_AFTER_3_DAYS: 1,
        ADMIN_PAID_OUT: 1,
        CANCELLED_BY_BUYER: 1,
        CANCELLED_BY_SELLER: 1,
        AUTO_CANCELLED_EXPIRED: 1,
        REJECTED_BY_ADMIN: 1,
      }),
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
  },
  { timestamps: true }
);

// Latest-first list + uniqueness per (recipient, transaction)
NotificationSchema.index({ recipient: 1, updatedAt: -1 });
NotificationSchema.index({ recipient: 1, transaction: 1 }, { unique: true });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
