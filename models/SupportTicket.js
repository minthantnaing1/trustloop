import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const SupportTicketSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: "User", required: true, index: true },

    category: {
      type: String,
      enum: [
        "ACCOUNT",
        "PAYMENT",
        "PRODUCT",
        "TRANSACTION",
        "CHAT",
        "BUG",
        "SCAM_SAFETY",
        "OTHER",
      ],
      default: "OTHER",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },

    // useful for admin to locate where the issue happened
    meta: { type: Object, default: {} },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },

    adminReply: { type: String, default: "", trim: true, maxlength: 4000 },
  },
  { timestamps: true },
);

export default mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", SupportTicketSchema);
