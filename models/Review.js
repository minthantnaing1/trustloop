import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const ReviewSchema = new mongoose.Schema({
  transaction: {
    type: ObjectId,
    ref: "Transaction",
    required: true,
    unique: true,
  }, // 1 review per txn
  product: { type: ObjectId, ref: "Product", required: true },
  buyer: { type: ObjectId, ref: "User", required: true },
  seller: { type: ObjectId, ref: "User", required: true },

  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },

  createdAt: { type: Date, default: Date.now },
});

// Indexes for fast lookups
ReviewSchema.index({ seller: 1, createdAt: -1 });
ReviewSchema.index({ buyer: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
