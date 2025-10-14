import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import User from "@/models/User";

export async function POST(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  // incoming role from UI: buyer | seller | donor | recipient
  const incomingRole = (searchParams.get("role") || "buyer").toLowerCase();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    // Ensure indexes are up-to-date (drops old unique `transaction_1` if it exists)
    await Review.syncIndexes();

    // Lean fetch: ids + status
    const txn = await Transaction.findById(id);
    if (!txn) return new Response("Transaction not found", { status: 404 });

    if (!txn.buyer || !txn.seller) {
      return new Response("Transaction parties incomplete", { status: 400 });
    }

    // Resolve users (for email checks)
    const [buyer, seller] = await Promise.all([
      User.findById(txn.buyer),
      User.findById(txn.seller),
    ]);
    if (!buyer || !seller) {
      return new Response("Transaction parties missing", { status: 400 });
    }

    // Only once the order is complete
    const allowed = new Set([
      "SELLER_DELIVERED",
      "MEETUP_COMPLETED",
      "AUTO_CONFIRMED_AFTER_3_DAYS",
      "BUYER_CONFIRMED",
      "PAID_OUT",
    ]);
    if (!allowed.has(txn.status)) {
      return new Response("Review not allowed yet", { status: 400 });
    }

    const viewerEmail = session.user.email.toLowerCase();

    // Map UI role → canonical role + access checks
    let reviewerDoc, targetDoc, role;
    if (incomingRole === "buyer" || incomingRole === "recipient") {
      if ((buyer.email || "").toLowerCase() !== viewerEmail) {
        return new Response("Only buyer/recipient may review", { status: 403 });
      }
      reviewerDoc = buyer;
      targetDoc = seller;
      role = "buyer";
    } else {
      if ((seller.email || "").toLowerCase() !== viewerEmail) {
        return new Response("Only seller/donor may review", { status: 403 });
      }
      reviewerDoc = seller;
      targetDoc = buyer;
      role = "seller";
    }

    const { rating, comment } = await req.json();
    if (!rating || rating < 1 || rating > 5) {
      return new Response("Invalid rating", { status: 400 });
    }

    // Enforce one review per (transaction, reviewer)
    const existing = await Review.findOne({
      transaction: txn._id,
      reviewer: reviewerDoc._id,
    });
    if (existing) {
      return new Response("Already reviewed", { status: 400 });
    }

    // Create review
    const review = await Review.create({
      transaction: txn._id,
      product: txn.product, // ObjectId from txn
      reviewer: reviewerDoc._id,
      target: targetDoc._id,
      role,
      rating,
      comment: comment || "",
    });

    // Update aggregate stats for the target user
    const targetUser = await User.findById(targetDoc._id);
    if (targetUser) {
      const totalScore =
        (targetUser.rating || 0) * (targetUser.reviewsCount || 0) + rating;
      targetUser.reviewsCount = (targetUser.reviewsCount || 0) + 1;
      targetUser.rating = totalScore / targetUser.reviewsCount;
      await targetUser.save();
    }

    return new Response(JSON.stringify(review), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Review POST error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function GET(req, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const incomingRole = (searchParams.get("role") || "buyer").toLowerCase();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const txn = await Transaction.findById(id);
    if (!txn) return new Response("Transaction not found", { status: 404 });

    // Map UI role → stored role
    const role =
      incomingRole === "donor"
        ? "seller"
        : incomingRole === "recipient"
        ? "buyer"
        : incomingRole === "seller"
        ? "seller"
        : "buyer";

    const review = await Review.findOne({ transaction: txn._id, role })
      .populate("reviewer", "name email image")
      .populate("target", "name email image")
      .populate("product", "title defaultImage");

    return new Response(JSON.stringify(review || null), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Review GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
