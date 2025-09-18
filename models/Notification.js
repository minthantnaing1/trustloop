// models/Notification.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: ObjectId, ref: "User", index: true, required: true }, // who sees it
    actor: { type: ObjectId, ref: "User" }, // who triggered it (buyer/seller/admin)

    transaction: { type: ObjectId, ref: "Transaction", index: true },
    product: { type: ObjectId, ref: "Product" },

    // Align with TIMELINE_LABELS keys
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

    title: { type: String, required: true }, // short “label” like TIMELINE_LABELS[type]
    message: { type: String, default: "" }, // optional extra context

    link: { type: String, default: "" }, // e.g. `/my-orders/:id` or `/admin/transactions/:id`
    meta: { type: Object, default: {} },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
