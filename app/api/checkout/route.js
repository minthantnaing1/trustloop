// app/api/checkout/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { transactionId } = await req.json();
  if (!transactionId) {
    return new Response("transactionId required", { status: 400 });
  }

  await connectDB();

  const txn =
    await Transaction.findById(transactionId).populate("product buyer");

  if (!txn) return new Response("Transaction not found", { status: 404 });
  if (txn.status !== "PENDING_PAYMENT") {
    return new Response("Invalid transaction state", { status: 400 });
  }

  if (!txn.expiresAt || txn.expiresAt.getTime() <= Date.now()) {
    return new Response("Payment window expired", { status: 410 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

  // ✅ keep meta in one place
  const meta = { transactionId: txn._id.toString() };

  const sessionStripe = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["promptpay"],
    customer_email: txn.buyer.email,

    // ✅ important for charge/payment_intent events mapping
    payment_intent_data: { metadata: meta },

    // ✅ also keep on session
    metadata: meta,

    line_items: [
      {
        price_data: {
          currency: "thb",
          product_data: {
            name: txn.product.title,
            description: "Secured by TrustLoop escrow",
          },
          // ✅ avoid float issues
          unit_amount: Math.round(Number(txn.total || 0) * 100),
        },
        quantity: 1,
      },
    ],

    success_url: `${BASE_URL}/pay/success?txn=${txn._id}`,
    cancel_url: `${BASE_URL}/pay/cancel?txn=${txn._id}`,
  });

  return Response.json({ url: sessionStripe.url });
}
