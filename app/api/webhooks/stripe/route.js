// app/api/webhooks/stripe/route.js
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";

async function tryGetStripeFeeTHBFromPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;

  // Expand charges so we can grab the balance transaction id
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges.data.balance_transaction"],
  });

  const charge = pi?.charges?.data?.[0];
  const bt = charge?.balance_transaction;

  // bt can be object or string depending on expand
  const btObj =
    bt && typeof bt === "object"
      ? bt
      : bt
        ? await stripe.balanceTransactions.retrieve(bt)
        : null;

  if (!btObj) return null;

  // Stripe uses smallest unit (satang) for THB
  const fee = Number(btObj.fee || 0) / 100;
  const net = Number(btObj.net || 0) / 100;

  return {
    feeTHB: fee,
    netTHB: net,
    balanceTxnId: btObj.id || "",
  };
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  await connectDB();

  try {
    /* ================= PAYMENT SUCCESS ================= */
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const transactionId = session.metadata?.transactionId;

      const txn = await Transaction.findById(transactionId);

      // ⛔ EXPIRED OR INVALID → AUTO REFUND
      if (
        !txn ||
        txn.status !== "PENDING_PAYMENT" ||
        (txn.expiresAt && txn.expiresAt.getTime() <= Date.now())
      ) {
        if (session.payment_intent) {
          await stripe.refunds.create({
            payment_intent: session.payment_intent,
            reason: "requested_by_customer",
          });
        }
        return new Response("Expired payment refunded", { status: 200 });
      }

      // ✅ VALID PAYMENT
      txn.status = "PAYMENT_SUCCESSFUL";
      txn.expiresAt = null;
      txn.hasPaymentSucceeded = true;

      // ✅ store Stripe identifiers
      txn.stripeCheckoutSessionId = session.id || "";
      txn.stripePaymentIntentId = session.payment_intent || "";

      // ✅ store Stripe fee/net (best effort)
      try {
        // only compute if not already stored (idempotent)
        if (!txn.stripeFee || txn.stripeFee === 0) {
          const info = await tryGetStripeFeeTHBFromPaymentIntent(
            session.payment_intent,
          );
          if (info) {
            txn.stripeFee = Number(info.feeTHB || 0);
            txn.stripeNet = Number(txn.total || 0) - Number(txn.stripeFee || 0);
            txn.stripeBalanceTxnId = info.balanceTxnId || "";
          }
        } else {
          // keep stripeNet in sync just in case
          txn.stripeNet = Number(txn.total || 0) - Number(txn.stripeFee || 0);
        }
      } catch (e) {
        console.warn(
          "⚠️ Could not fetch Stripe fee for txn:",
          txn._id,
          e?.message,
        );
        // still continue; finance will show stripeFee as 0 until later fix
      }

      txn.timeline.push({
        at: new Date(),
        action: "STRIPE_PAYMENT_CONFIRMED",
        meta: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
      });

      await txn.save();
    }

    /* ================= PAYMENT FAILED ================= */
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const transactionId = pi.metadata?.transactionId;

      const txn = await Transaction.findById(transactionId);
      if (
        !txn ||
        txn.status !== "PENDING_PAYMENT" ||
        (txn.expiresAt && txn.expiresAt.getTime() <= Date.now())
      ) {
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
          { $set: { isAvailable: true } },
        );
      }
    }
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return new Response("Webhook failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
