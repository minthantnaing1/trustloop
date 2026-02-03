import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const SupportTicketSchema = new mongoose.Schema(
  {
    // Who created the report
    user: { type: ObjectId, ref: "User", required: true, index: true },

    // Optional relations (auto-filled from Order Detail page)
    transaction: { type: ObjectId, ref: "Transaction", index: true },
    product: { type: ObjectId, ref: "Product", index: true },
    buyer: { type: ObjectId, ref: "User" },
    seller: { type: ObjectId, ref: "User" },

    // Ticket info
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
      index: true,
    },

    subject: { type: String, required: true },
    description: { type: String, required: true },

    // Attachments (optional proof)
    images: { type: [String], default: [] },

    // Admin handling
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "REJECTED"],
      default: "OPEN",
      index: true,
    },

    adminNote: { type: String, default: "" },
    assignedAdmin: { type: ObjectId, ref: "User" },

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

// keep updatedAt fresh
SupportTicketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", SupportTicketSchema);
