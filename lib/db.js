import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ Please define the MONGODB_URI environment variable inside .env"
  );
}

// ✅ Global cache to prevent multiple connections in serverless
let cached = global.mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: "trustloop",
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  global.mongoose = cached;

  console.log("✅ Connected to MongoDB");
  return cached.conn;
}
