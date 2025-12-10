// app/api/checkout/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { stripe } from "@/lib/stripe";
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

  const txn = await Transaction.findById(transactionId)
    .populate("product")
    .populate("buyer");

  if (!txn) return new Response("Transaction not found", { status: 404 });

  // ✅ Guard
  if (txn.status !== "PENDING_PAYMENT") {
    return new Response("Invalid transaction state", { status: 400 });
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "promptpay"],
    customer_email: txn.buyer.email,

    payment_intent_data: {
      metadata: {
        transactionId: txn._id.toString(),
      },
    },

    line_items: [
      {
        price_data: {
          currency: "thb",
          product_data: {
            name: txn.product.title,
            description: "Secured by TrustLoop escrow",
          },
          unit_amount: txn.total * 100,
        },
        quantity: 1,
      },
    ],

    metadata: {
      transactionId: txn._id.toString(),
    },

    success_url: `${BASE_URL}/pay/success`,
    cancel_url: `${BASE_URL}/pay/cancel`,
  });

  return Response.json({ url: checkoutSession.url });
}
