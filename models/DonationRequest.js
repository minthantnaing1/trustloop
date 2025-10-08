import mongoose from "mongoose";

const DonationRequestSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: { type: String, default: "" }, // short message from requester
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure a user can submit only 1 active request per product
DonationRequestSchema.index(
  { product: 1, requester: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending"] } },
  }
);

export default mongoose.models.DonationRequest ||
  mongoose.model("DonationRequest", DonationRequestSchema);
