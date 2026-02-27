import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { notifyTxnEvent } from "@/lib/notify";

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  const { productId, buyerLocation = "" } = await req.json();

  if (!productId) return new Response("productId required", { status: 400 });

  const loc = String(buyerLocation || "").trim();
  if (!loc) return new Response("buyerLocation required", { status: 400 });

  await connectDB();

  const buyerUser = await User.findOne({ email: session.user.email });
  if (!buyerUser) return new Response("User record not found", { status: 404 });

  // 1) Reuse existing *active* txn for this buyer+product if not expired
  const ACTIVE = [
    "PENDING_PAYMENT",
    "PAYMENT_SUCCESSFUL",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
  ];

  const existing = await Transaction.findOne({
    product: productId,
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

  // 2) Atomically reserve the product for 5 minutes
  const product = await Product.findOneAndUpdate(
    { _id: productId, isAvailable: true },
    { $set: { isAvailable: false } },
    { new: true },
  ).populate("owner");

  if (!product) {
    return new Response("Product not available", { status: 400 });
  }
  if (String(product.owner?._id) === String(buyerUser._id)) {
    await Product.updateOne(
      { _id: productId },
      { $set: { isAvailable: true } },
    );
    return new Response("Cannot buy your own product", { status: 400 });
  }

  // fees/totals
  const price = Number(product.price || 0);

  // 5% seller fee
  const fee = Math.round(price * 0.05);

  // buyer pays only price
  const total = price;

  // seller receives price − fee
  const sellerNet = price - fee;

  try {
    const txn = await Transaction.create({
      product: product._id,
      seller: product.owner._id,
      buyer: buyerUser._id,
      status: "PENDING_PAYMENT",
      price,
      fee,
      total,
      sellerNet,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      buyerLocation: loc,
      timeline: [
        {
          by: buyerUser._id,
          action: "ORDER_CREATED",
          meta: { buyerLocation: loc, price, fee, total },
        },
      ],
    });

    await notifyTxnEvent({
      txn,
      actorId: buyerUser._id,
      type: "ORDER_CREATED",
    });

    return Response.json({ transactionId: txn._id, reused: false });
  } catch (e) {
    await Product.updateOne(
      { _id: productId },
      { $set: { isAvailable: true } },
    );
    console.error("Create transaction failed; reservation released:", e);
    return new Response("Server Error", { status: 500 });
  }
}
