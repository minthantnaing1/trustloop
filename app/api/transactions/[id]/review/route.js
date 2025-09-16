import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import User from "@/models/User";

// ✅ Create a review for a completed transaction
export async function POST(req, { params }) {
  const { id } = await params; // transactionId

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    // 1. Find txn and make sure buyer is correct + status confirmed
    const txn = await Transaction.findById(id).populate("buyer seller product");
    if (!txn) return new Response("Transaction not found", { status: 404 });

    if (!["BUYER_CONFIRMED", "PAID_OUT"].includes(txn.status)) {
      return new Response("Review not allowed until buyer has confirmed", {
        status: 400,
      });
    }

    if (txn.reviewed) {
      return new Response("This transaction has already been reviewed", {
        status: 400,
      });
    }

    if (txn.buyer.email !== session.user.email) {
      return new Response("Only the buyer can leave a review", { status: 403 });
    }

    // 2. Parse body
    const { rating, comment } = await req.json();
    if (!rating || rating < 1 || rating > 5) {
      return new Response("Invalid rating", { status: 400 });
    }

    // 3. Create review
    const review = await Review.create({
      transaction: txn._id,
      product: txn.product._id,
      buyer: txn.buyer._id,
      seller: txn.seller._id,
      rating,
      comment: comment || "",
    });

    // 4. Mark transaction as reviewed
    txn.reviewed = true;
    await txn.save();

    // 5. Update seller aggregate stats
    const seller = await User.findById(txn.seller._id);
    if (seller) {
      const totalScore = seller.rating * seller.reviewsCount + rating;
      seller.reviewsCount += 1;
      seller.rating = totalScore / seller.reviewsCount;
      await seller.save();
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

// ✅ Fetch review for a transaction (buyer or seller can see it)
export async function GET(_req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const txn = await Transaction.findById(id).populate("buyer seller");
    if (!txn) return new Response("Transaction not found", { status: 404 });

    const review = await Review.findOne({ transaction: txn._id })
      .populate("buyer", "name email image")
      .populate("seller", "name email image")
      .populate("product", "title defaultImage");

    if (!review) {
      return new Response(JSON.stringify(null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(review), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Review GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
