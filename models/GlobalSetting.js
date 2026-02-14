import mongoose from "mongoose";

const GlobalSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "global", index: true },

    maintenance: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "" }, // optional banner message
      updatedAt: { type: Date, default: null },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true },
);

export default mongoose.models.GlobalSetting ||
  mongoose.model("GlobalSetting", GlobalSettingSchema);
