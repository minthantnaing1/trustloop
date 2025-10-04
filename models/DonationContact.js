import mongoose from "mongoose";

const DonationContactSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, // ← ref Product
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  requesterName: { type: String, required: true },
  requesterEmail: { type: String, required: true },
  message: { type: String, required: true },

  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  readByDonor: { type: Boolean, default: false },

  replies: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

DonationContactSchema.index({ donorId: 1, createdAt: -1 });
DonationContactSchema.index({ requesterId: 1, createdAt: -1 });
DonationContactSchema.index({ itemId: 1 });

export default mongoose.models.DonationContact ||
  mongoose.model("DonationContact", DonationContactSchema);
