import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  // Basic Info
  name: String,
  email: { type: String, unique: true, required: true },
  image: String,

  // Contact & Academic Info
  phone: String,
  faculty: String,
  year: {
    type: String,
    enum: ["Freshman", "Sophomore", "Junior", "Senior"],
  },

  // Role & Permissions
  role: { type: String, enum: ["user", "admin"], default: "user" },
  postingCredits: { type: Number, default: 5 },

  // Trust & Reputation
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  badges: [String], // e.g., ['trusted seller']

  // Finance
  revenue: { type: Number, default: 0 }, // Income from selling
  expenses: { type: Number, default: 0 }, // Cost from buying

  // Required Fields for Transactions
  location: { type: String }, // e.g., "AU Dorm 2" or "Bangna Campus"
  defaultScanCode: String, // Default QR or scanner setting
  bankAccountName: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },

  // Favorites (added)
  favorites: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: [] },
  ],

  // Notification
  unreadNotifications: { type: Number, default: 0 },
  lastNotificationsSeenAt: { type: Date },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
