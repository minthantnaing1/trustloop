// app/api/transactions/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  const { productId } = await req.json();
  if (!productId) return new Response("productId required", { status: 400 });

  await connectDB();

  const buyerUser = await User.findOne({ email: session.user.email });
  if (!buyerUser) return new Response("User record not found", { status: 404 });

  const product = await Product.findById(productId).populate("owner");
  if (!product) return new Response("Product not found", { status: 404 });
  if (!product.isAvailable)
    return new Response("Product not available", { status: 400 });
  if (String(product.owner?._id) === String(buyerUser._id)) {
    return new Response("Cannot buy your own product", { status: 400 });
  }

  const ACTIVE = [
    "PENDING_UPLOAD",
    "AWAITING_ADMIN_REVIEW",
    "ESCROW_FUNDED",
    "DELIVERY_IN_PROGRESS",
    "BUYER_CONFIRMED",
  ];

  const existing = await Transaction.findOne({
    product: product._id,
    buyer: buyerUser._id,
    status: { $in: ACTIVE },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });

  if (existing) {
    return Response.json({ transactionId: existing._id, reused: true });
  }

  const fee = Number(process.env.PLATFORM_FEE || 10);
  const price = Number(product.price || 0);
  const total = price + fee;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const txn = await Transaction.create({
    product: product._id,
    seller: product.owner._id,
    buyer: buyerUser._id,
    status: "PENDING_UPLOAD",
    price,
    fee,
    total,
    sellerNet: price,
    expiresAt,
    timeline: [{ by: buyerUser._id, action: "ORDER_CREATED" }],
  });

  return Response.json({ transactionId: txn._id, reused: false });
}
