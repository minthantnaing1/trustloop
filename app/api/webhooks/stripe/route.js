import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(req) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  await connectDB();

  // --------------------------
  // ✅ PAYMENT SUCCESS
  // --------------------------
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const transactionId = session.metadata?.transactionId;

    const txn = await Transaction.findById(transactionId);
    if (!txn || txn.status !== "PENDING_PAYMENT") {
      return new Response("Ignored", { status: 200 });
    }

    txn.status = "ESCROW_FUNDED";
    txn.expiresAt = null;

    txn.timeline.push({
      at: new Date(),
      action: "STRIPE_PAYMENT_CONFIRMED",
      meta: { sessionId: session.id },
    });

    await txn.save();
  }

  // --------------------------
  // ✅ PAYMENT FAILED
  // --------------------------
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const transactionId = pi.metadata?.transactionId;

    if (!transactionId) return new Response("OK", { status: 200 });

    const txn = await Transaction.findById(transactionId);
    if (!txn || txn.status !== "PENDING_PAYMENT") {
      return new Response("Ignored", { status: 200 });
    }

    txn.status = "CANCELLED_BY_BUYER";
    txn.cancelReason = "stripe_payment_failed";

    txn.timeline.push({
      at: new Date(),
      action: "PAYMENT_FAILED",
      meta: { reason: pi.last_payment_error?.message },
    });

    await txn.save();

    if (txn.product) {
      await Product.updateOne(
        { _id: txn.product },
        { $set: { isAvailable: true } }
      );
    }
  }

  return new Response("OK", { status: 200 });
}
