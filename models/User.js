// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    image: String,
    role: { type: String, default: "user" },
  },
  { timestamps: true }
);

// prevent re-compilation error in dev
export default mongoose.models.User || mongoose.model("User", UserSchema);
