import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const ReviewSchema = new mongoose.Schema(
  {
    transaction: { type: ObjectId, ref: "Transaction", required: true },
    product: { type: ObjectId, ref: "Product", required: true },

    // who wrote the review (buyer/recipient or seller/donor)
    reviewer: { type: ObjectId, ref: "User", required: true },
    // who is being reviewed
    target: { type: ObjectId, ref: "User", required: true },

    // normalize to two roles: 'buyer' (buyer/recipient) or 'seller' (seller/donor)
    role: { type: String, enum: ["buyer", "seller"], required: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, strict: true }
);

// ✅ Exactly one review per reviewer per transaction
ReviewSchema.index({ transaction: 1, reviewer: 1 }, { unique: true });

// Helpful lookups
ReviewSchema.index({ transaction: 1, role: 1 }); // non-unique, for reads
ReviewSchema.index({ target: 1, createdAt: -1 });
ReviewSchema.index({ reviewer: 1, createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
