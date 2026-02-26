import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Basic Info
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, required: true },
    images: [String],
    defaultImage: String,
    condition: {
      type: String,
      enum: ["new", "like new", "used", "poor"],
      required: true,
    },

    // Type of listing
    type: {
      type: String,
      enum: ["sell", "auction", "donation", "request"],
      required: true,
    },

    // Pricing
    price: { type: Number, required: true }, // sell or request
    startingPrice: { type: Number }, // auction
    currentBid: {
      amount: Number,
      bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    bidHistory: [
      {
        bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: Number,
        time: { type: Date, default: Date.now },
      },
    ],

    // Donation
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // NEW: Donation mode & optional deadline (for selective)
    donationMode: {
      type: String,
      enum: ["instant", "selective"],
    },
    requestDeadline: { type: Date },

    // Auction timing
    auctionEndsAt: { type: Date },
    // Auction resolution (winner payment + fallback)
    auctionResolution: {
      status: {
        type: String,
        enum: ["OPEN", "AWAITING_PAYMENT", "SOLD", "UNSUCCESSFUL"],
        default: "OPEN",
      },
      // Highest -> lowest queue (unique bidders)
      queue: [
        {
          bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          amount: { type: Number, default: 0 },
          time: { type: Date }, // optional (from bidHistory)
        },
      ],
      currentIndex: { type: Number, default: 0 },
      currentTxn: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
      paymentExpiresAt: { type: Date },
      closedAt: { type: Date },
    },

    // Lifecycle
    isAvailable: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    expiresAt: { type: Date },

    // Metadata
    location: { type: String, default: "Assumption University" },
    tags: [String],

    // Engagement
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        userEmail: { type: String, required: true },
        username: String,
        userImage: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
