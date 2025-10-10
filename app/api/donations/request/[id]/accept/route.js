// app/api/donations/request/[id]/accept/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import DonationRequest from "@/models/DonationRequest";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { notifyTxnEvent } from "@/lib/notify";

export async function POST(_req, { params }) {
  const { id } = await params; // requestId
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const reqDoc = await DonationRequest.findById(id).populate(
      "product requester"
    );
    if (!reqDoc) return new Response("Request not found", { status: 404 });

    const product = await Product.findById(reqDoc.product._id).populate(
      "owner"
    );
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.owner.email !== session.user.email)
      return new Response("Unauthorized", { status: 403 });

    if (product.isAvailable === false) {
      return new Response("This item is already reserved/unavailable.", {
        status: 409,
      });
    }

    // Accept this request
    reqDoc.status = "accepted";
    await reqDoc.save();

    // Reserve product
    product.isAvailable = false;
    await product.save();

    // Create zero-cost DONATION txn, meetup-only, jump to SELLER_ACCEPTED
    const txn = await Transaction.create({
      kind: "DONATION",
      product: product._id,
      buyer: reqDoc.requester._id,
      seller: product.owner._id,
      status: "SELLER_ACCEPTED",
      price: 0,
      fee: 0,
      total: 0,
      sellerNet: 0,
      fulfillment: {
        method: "MEETUP",
        meetupLocation: product.location || "",
        notes: "",
      },
      requestReason: reqDoc.reason || "",
      timeline: [
        {
          by: product.owner._id,
          action: "SELLER_ACCEPTED",
          meta: { requestId: String(reqDoc._id) },
        },
      ],
    });

    // 🔔 notify recipient/donor/admins
    await notifyTxnEvent({
      txn,
      actorId: product.owner._id,
      type: "SELLER_ACCEPTED",
    });

    return new Response(
      JSON.stringify({ ok: true, orderId: String(txn._id) }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ accept error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
