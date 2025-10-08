// app/api/donations/request/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import DonationRequest from "@/models/DonationRequest";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const { productId, reason } = await req.json();
    if (!productId || !reason || reason.trim().length < 10) {
      return new Response("Reason is required (min 10 chars).", {
        status: 400,
      });
    }

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select(
      "_id email"
    );
    if (!me) return new Response("Unauthorized", { status: 401 });

    const product = await Product.findById(productId).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.type !== "donation") {
      return new Response("Not a donation item.", { status: 400 });
    }
    if (String(product.owner?._id) === String(me._id)) {
      return new Response("You cannot request your own donation.", {
        status: 403,
      });
    }
    if (product.isAvailable === false) {
      return new Response("This item is already reserved/unavailable.", {
        status: 409,
      });
    }
    if (product.donationMode !== "selective") {
      return new Response("This donation is instant only.", { status: 400 });
    }
    if (
      product.requestDeadline &&
      new Date(product.requestDeadline) < new Date()
    ) {
      return new Response("Request deadline has passed.", { status: 409 });
    }

    // upsert a single pending request per user/product
    // (schema also enforces uniqueness for status: "pending")
    const doc = await DonationRequest.findOneAndUpdate(
      { product: product._id, requester: me._id, status: "pending" },
      { $set: { reason: reason.trim() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return new Response(
      JSON.stringify({ ok: true, requestId: String(doc._id) }),
      {
        status: 200,
      }
    );
  } catch (e) {
    console.error("donation-requests POST error:", e);
    // Handle unique constraint race
    if (String(e?.code) === "11000") {
      return new Response("You already have a pending request.", {
        status: 409,
      });
    }
    return new Response("Server Error", { status: 500 });
  }
}
