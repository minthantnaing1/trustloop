// app/api/donations/request/[id]/reject/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import DonationRequest from "@/models/DonationRequest";
import Product from "@/models/Product";

export async function POST(_req, { params }) {
  const { id } = params; // requestId
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const reqDoc = await DonationRequest.findById(id).populate("product");
    if (!reqDoc) return new Response("Request not found", { status: 404 });

    const product = await Product.findById(reqDoc.product._id).populate(
      "owner"
    );
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.owner.email !== session.user.email)
      return new Response("Unauthorized", { status: 403 });

    reqDoc.status = "rejected";
    await reqDoc.save();

    return new Response("Rejected successfully", { status: 200 });
  } catch (err) {
    console.error("❌ reject error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
