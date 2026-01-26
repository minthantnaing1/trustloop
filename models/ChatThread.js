// models/ChatThread.js
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const ThreadMessageSchema = new mongoose.Schema(
  {
    by: { type: ObjectId, ref: "User", required: true, index: true },

    // ✅ allow empty text if images exist
    text: { type: String, default: "", trim: true, maxlength: 1500 },

    // ✅ NEW: image urls (Cloudinary)
    images: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: true },
);

const ChatThreadSchema = new mongoose.Schema(
  {
    txn: {
      type: ObjectId,
      ref: "Transaction",
      required: true,
      unique: true,
      index: true,
    },
    buyer: { type: ObjectId, ref: "User", required: true, index: true },
    seller: { type: ObjectId, ref: "User", required: true, index: true },

    // ✅ embedded chat messages (single doc per txn)
    messages: { type: [ThreadMessageSchema], default: [] },

    lastMessageAt: { type: Date },
    lastMessageText: { type: String, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.ChatThread ||
  mongoose.model("ChatThread", ChatThreadSchema);
