// models/AdminSettlement.js
import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const AdminSettlementSchema = new mongoose.Schema(
  {
    // the admin who pays (typically the Stripe-owner admin)
    fromAdmin: { type: ObjectId, ref: "User", required: true, index: true },

    // the admin being reimbursed
    toAdmin: { type: ObjectId, ref: "User", required: true, index: true },

    amount: { type: Number, required: true, min: 0 },
    receiptUrl: { type: String, default: "" },
    note: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export default mongoose.models.AdminSettlement ||
  mongoose.model("AdminSettlement", AdminSettlementSchema);
