// models/SupportTicket.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const MessageSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["USER", "ADMIN"], required: true },
    text: { type: String, required: true },
  },
  { _id: false },
);

const SupportTicketSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },

    transaction: { type: ObjectId, ref: "Transaction" },
    product: { type: ObjectId, ref: "Product" },
    buyer: { type: ObjectId, ref: "User" },
    seller: { type: ObjectId, ref: "User" },

    category: {
      type: String,
      enum: [
        "DELIVERY_DELAY",
        "WRONG_ITEM",
        "PAYMENT_ISSUE",
        "SELLER_NO_SHOW",
        "BUYER_NO_SHOW",
        "OTHER",
      ],
      required: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    subject: { type: String, default: "" },

    // initial user report (NOT chat)
    description: { type: String, required: true },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },

    // ✅ who last changed status (for "Closed by Admin X")
    statusUpdatedBy: { type: ObjectId, ref: "User" },
    statusUpdatedAt: { type: Date },

    messages: { type: [MessageSchema], default: [] },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

SupportTicketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", SupportTicketSchema);
