import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import DonationRequest from "@/models/DonationRequest";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export async function POST(_req, { params }) {
  const { id } = params; // requestId
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    // Find the request
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

    // Mark accepted request
    reqDoc.status = "accepted";
    await reqDoc.save();

    // Mark product unavailable
    product.isAvailable = false;
    await product.save();

    // Create zero-cost transaction
    await Transaction.create({
      product: product._id,
      buyer: reqDoc.requester._id,
      seller: product.owner._id,
      price: 0,
      platformFee: 0,
      status: "PENDING_SELLER_ACTION",
      note: reqDoc.reason || "",
    });

    return new Response("Accepted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ accept error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
