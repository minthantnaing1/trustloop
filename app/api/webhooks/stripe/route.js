// app/api/webhooks/stripe/route.js
import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { advanceAuctionWinner } from "@/lib/auctionFlow";
import { notifyTxnEvent } from "@/lib/notify";

export const runtime = "nodejs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toTHB(minor) {
  return Number(minor || 0) / 100;
}

async function getFeeFromChargeExpanded(chargeId) {
  if (!chargeId) return null;

  const ch = await stripe.charges.retrieve(chargeId, {
    expand: ["balance_transaction"],
  });

  const bt = ch?.balance_transaction;
  const btObj = typeof bt === "object" ? bt : null;
  if (!btObj?.id) return null;

  const feeTHB = toTHB(btObj.fee);
  const netTHB = toTHB(btObj.net);

  return {
    feeTHB,
    netTHB,
    balanceTxnId: btObj.id || "",
  };
}

async function tryGetStripeFeeTHBFromPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges.data.balance_transaction"],
  });

  const charge = pi?.charges?.data?.[0];
  const bt = charge?.balance_transaction;

  const btObj =
    bt && typeof bt === "object"
      ? bt
      : bt
        ? await stripe.balanceTransactions.retrieve(bt)
        : null;

  if (!btObj) return null;

  const fee = Number(btObj.fee || 0) / 100;
  const net = Number(btObj.net || 0) / 100;

  return {
    feeTHB: fee,
    netTHB: net,
    balanceTxnId: btObj.id || "",
  };
}

async function recordStripeFeeWithRetry({
  transactionId,
  chargeId,
  paymentIntentId,
}) {
  if (!transactionId) return;

  const txn = await Transaction.findById(transactionId);
  if (!txn) return;

  // idempotent
  if (Number(txn.stripeFee || 0) > 0) {
    const net = Number(txn.total || 0) - Number(txn.stripeFee || 0);
    if (Number(txn.stripeNet || 0) !== net) {
      txn.stripeNet = net;
      await txn.save();
    }
    return;
  }

  // ✅ PromptPay sometimes delays balance_transaction fee; retry a few times
  let info = null;
  const delays = [0, 600, 900, 1200, 1500]; // ~4.2s max

  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);

    try {
      info = await getFeeFromChargeExpanded(chargeId);
      if (info && Number(info.feeTHB || 0) > 0) break;
      info = null;
    } catch (e) {
      info = null;
    }
  }

  // fallback to PI expand once
  if (!info && paymentIntentId) {
    try {
      info = await tryGetStripeFeeTHBFromPaymentIntent(paymentIntentId);
      if (info && Number(info.feeTHB || 0) <= 0) info = null;
    } catch (e) {
      info = null;
    }
  }

  if (!info) return;

  txn.stripeFee = Number(info.feeTHB || 0);
  txn.stripeNet = Number(txn.total || 0) - Number(txn.stripeFee || 0);
  txn.stripeBalanceTxnId = info.balanceTxnId || "";

  txn.timeline.push({
    at: new Date(),
    action: "STRIPE_FEE_RECORDED",
    meta: {
      paymentIntentId: paymentIntentId || txn.stripePaymentIntentId || "",
      chargeId: chargeId || "",
      balanceTxnId: txn.stripeBalanceTxnId,
      stripeFee: txn.stripeFee,
      stripeNet: txn.stripeNet,
    },
  });

  await txn.save();
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

      // ✅ DO NOT try to record fee here (PromptPay often not ready yet)

      txn.timeline.push({
        at: new Date(),
        action: "STRIPE_PAYMENT_CONFIRMED",
        meta: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
      });

      await txn.save();

      await notifyTxnEvent({
        txn,
        actorId: txn.buyer || null,
        type: "STRIPE_PAYMENT_CONFIRMED",
      });
    }

    /* ================= CHARGE SUCCEEDED (BEST for fee) ================= */
    if (event.type === "charge.succeeded") {
      const ch = event.data.object;

      const transactionId = ch?.metadata?.transactionId || "";
      const chargeId = ch?.id || "";
      const paymentIntentId =
        typeof ch.payment_intent === "string"
          ? ch.payment_intent
          : ch.payment_intent?.id || "";

      await recordStripeFeeWithRetry({
        transactionId,
        chargeId,
        paymentIntentId,
      });
    }

    /* ================= PAYMENT INTENT SUCCEEDED (backup) ================= */
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const transactionId = pi?.metadata?.transactionId || "";
      await recordStripeFeeWithRetry({
        transactionId,
        chargeId: "",
        paymentIntentId: pi?.id || "",
      });
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

      await notifyTxnEvent({
        txn,
        actorId: null,
        type: "PAYMENT_FAILED",
      });

      if (txn.product) {
        // ✅ AUCTION: advance winner queue instead of releasing product
        if (txn.kind === "AUCTION") {
          await advanceAuctionWinner(String(txn.product), String(txn._id), {
            // webhook has no user; you can omit actor or leave null
            actorUserId: null,
          });
        } else {
          await Product.updateOne(
            { _id: txn.product },
            { $set: { isAvailable: true } },
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return new Response("Webhook failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
