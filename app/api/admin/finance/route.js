// app/api/admin/finance/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import AdminSettlement from "@/models/AdminSettlement";
import mongoose from "mongoose";

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function getLatestTimelineActorId(txn, action) {
  const arr = Array.isArray(txn?.timeline) ? txn.timeline : [];
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i]?.action === action && arr[i]?.by) return String(arr[i].by);
  }
  return "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email }).select(
    "_id role name email adminRank",
  );
  if (!me || me.role !== "admin")
    return new Response("Forbidden", { status: 403 });

  const isDeveloper = String(me.adminRank || "NORMAL") === "DEVELOPER";

  // Only BUY_SELL transactions that have had payment success at least once
  const txns = await Transaction.find({
    kind: "BUY_SELL",
    hasPaymentSucceeded: true,
  })
    .populate("buyer", "name email")
    .populate("seller", "name email")
    .populate("product", "title")
    .sort({ createdAt: -1 })
    .lean();

  // Admin list (for settlement dropdown) + include adminRank
  const admins = await User.find({ role: "admin" })
    .select("_id name email role adminRank")
    .lean();

  // Settlement history
  const settlements = await AdminSettlement.find()
    .populate("fromAdmin", "name email adminRank")
    .populate("toAdmin", "name email adminRank")
    .sort({ createdAt: -1 })
    .lean();

  // ---------- PLATFORM CALCS ----------
  let incomingTotal = 0;
  let stripeFeesTotal = 0;
  let leftAfterStripeTotal = 0;
  let profitTotal = 0;

  let outstandingPayoutTotal = 0;
  let outstandingRefundTotal = 0;

  const rows = txns.map((t) => {
    const total = money(t.total);
    const fee5 = money(t.fee); // your 5%
    const stripeFee = money(t.stripeFee);
    const leftAfterStripe = total - stripeFee;
    const profit = fee5 - stripeFee;

    incomingTotal += total;
    stripeFeesTotal += stripeFee;
    leftAfterStripeTotal += leftAfterStripe;
    profitTotal += profit;

    const isOutstandingPayout =
      t.status === "BUYER_CONFIRMED" && !t.adminPayoutReceiptUrl;

    const isCancelled =
      t.status === "CANCELLED_BY_BUYER" || t.status === "CANCELLED_BY_SELLER";
    const isOutstandingRefund =
      isCancelled && !!t.hasPaymentSucceeded && !t.adminRefundReceiptUrl;

    if (isOutstandingPayout) outstandingPayoutTotal += money(t.sellerNet);
    if (isOutstandingRefund)
      outstandingRefundTotal += money(t.buyerRefundNet || t.total - t.fee);

    const payoutAdminId = t.adminPayoutReceiptUrl
      ? getLatestTimelineActorId(t, "ADMIN_PAID_OUT")
      : "";
    const refundAdminId = t.adminRefundReceiptUrl
      ? getLatestTimelineActorId(t, "ADMIN_REFUNDED_BUYER")
      : "";

    return {
      _id: String(t._id),
      createdAt: t.createdAt,
      status: t.status,

      productTitle: t.product?.title || "",
      buyer: t.buyer ? { name: t.buyer.name, email: t.buyer.email } : null,
      seller: t.seller ? { name: t.seller.name, email: t.seller.email } : null,

      incoming: total,
      stripeFee,
      leftAfterStripe,
      platformFee: fee5,
      profit,

      sellerNet: money(t.sellerNet),
      buyerRefundNet: money(t.buyerRefundNet || t.total - t.fee),

      adminPayoutReceiptUrl: t.adminPayoutReceiptUrl || "",
      adminRefundReceiptUrl: t.adminRefundReceiptUrl || "",

      isOutstandingPayout,
      isOutstandingRefund,

      payoutAdminId,
      refundAdminId,
    };
  });

  // ---------- ADMIN LEDGER ----------
  const adminMap = new Map();

  function ensureAdmin(adminId) {
    if (!adminMap.has(adminId)) {
      adminMap.set(adminId, {
        adminId,
        payoutAdvance: 0,
        refundAdvance: 0,
        advancedTotal: 0,
        reimbursedTotal: 0,
        netOwed: 0,
      });
    }
    return adminMap.get(adminId);
  }

  for (const r of rows) {
    if (r.payoutAdminId) {
      const a = ensureAdmin(r.payoutAdminId);
      a.payoutAdvance += money(r.sellerNet);
    }
    if (r.refundAdminId) {
      const a = ensureAdmin(r.refundAdminId);
      a.refundAdvance += money(r.buyerRefundNet);
    }
  }

  for (const s of settlements) {
    const toId = String(s.toAdmin?._id || s.toAdmin);
    if (!toId) continue;
    const a = ensureAdmin(toId);
    a.reimbursedTotal += money(s.amount);
  }

  for (const a of adminMap.values()) {
    a.advancedTotal = money(a.payoutAdvance) + money(a.refundAdvance);
    a.netOwed = money(a.advancedTotal) - money(a.reimbursedTotal);
  }

  const adminInfo = new Map(admins.map((u) => [String(u._id), u]));
  const adminLedger = Array.from(adminMap.values())
    .map((a) => {
      const info = adminInfo.get(String(a.adminId));
      return {
        ...a,
        name: info?.name || "Unknown",
        email: info?.email || "",
      };
    })
    .sort((x, y) => money(y.netOwed) - money(x.netOwed));

  return Response.json({
    ok: true,

    // ✅ expose permission to client
    permissions: {
      isDeveloper,
      adminRank: String(me.adminRank || "NORMAL"),
      adminId: String(me._id),
    },

    summary: {
      incomingTotal,
      stripeFeesTotal,
      leftAfterStripeTotal,
      profitTotal,
      outstandingPayoutTotal,
      outstandingRefundTotal,
    },
    rows,

    // ✅ include adminRank for dropdown filtering (optional)
    admins: admins.map((a) => ({
      _id: String(a._id),
      name: a.name,
      email: a.email,
      adminRank: String(a.adminRank || "NORMAL"),
    })),

    adminLedger,

    settlements: settlements.map((s) => ({
      _id: String(s._id),
      fromAdmin: s.fromAdmin
        ? {
            _id: String(s.fromAdmin._id),
            name: s.fromAdmin.name,
            email: s.fromAdmin.email,
            adminRank: String(s.fromAdmin.adminRank || "NORMAL"),
          }
        : null,
      toAdmin: s.toAdmin
        ? {
            _id: String(s.toAdmin._id),
            name: s.toAdmin.name,
            email: s.toAdmin.email,
            adminRank: String(s.toAdmin.adminRank || "NORMAL"),
          }
        : null,
      amount: money(s.amount),
      receiptUrl: s.receiptUrl || "",
      note: s.note || "",
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email }).select(
    "_id role adminRank",
  );
  if (!me || me.role !== "admin")
    return new Response("Forbidden", { status: 403 });

  // ✅ Only Stripe owner (DEVELOPER) can record repayments
  const isDeveloper = String(me.adminRank || "NORMAL") === "DEVELOPER";
  if (!isDeveloper) {
    return new Response("Only Stripe owner can record repayments.", {
      status: 403,
    });
  }

  const body = await req.json().catch(() => ({}));
  const { toAdminId, amount, receiptUrl, note } = body;

  if (!toAdminId || !mongoose.Types.ObjectId.isValid(toAdminId)) {
    return new Response("Invalid toAdminId", { status: 400 });
  }

  const amt = money(amount);
  if (!(amt > 0)) return new Response("Amount must be > 0", { status: 400 });

  // ----- MINIMAL FIX STARTS HERE -----
  // We must block repayment if nothing is owed, and cap repayment by total owed (including self).
  // Also: slip is optional ONLY when paying self.

  // Rebuild owed map (admin advances - reimbursed), same logic as GET, but minimal & local.
  const txns = await Transaction.find({
    kind: "BUY_SELL",
    hasPaymentSucceeded: true,
  })
    .select(
      "status total fee sellerNet buyerRefundNet hasPaymentSucceeded adminPayoutReceiptUrl adminRefundReceiptUrl timeline",
    )
    .lean();

  const settlements = await AdminSettlement.find()
    .select("toAdmin amount")
    .lean();

  const adminMap = new Map(); // adminId -> { payoutAdvance, refundAdvance, reimbursedTotal }

  function ensureAdmin(adminId) {
    if (!adminId) return null;
    const k = String(adminId);
    if (!adminMap.has(k)) {
      adminMap.set(k, {
        payoutAdvance: 0,
        refundAdvance: 0,
        reimbursedTotal: 0,
      });
    }
    return adminMap.get(k);
  }

  for (const t of txns) {
    const payoutAdminId = t.adminPayoutReceiptUrl
      ? getLatestTimelineActorId(t, "ADMIN_PAID_OUT")
      : "";
    const refundAdminId = t.adminRefundReceiptUrl
      ? getLatestTimelineActorId(t, "ADMIN_REFUNDED_BUYER")
      : "";

    if (payoutAdminId) {
      const a = ensureAdmin(payoutAdminId);
      if (a) a.payoutAdvance += money(t.sellerNet);
    }
    if (refundAdminId) {
      const a = ensureAdmin(refundAdminId);
      if (a)
        a.refundAdvance += money(
          t.buyerRefundNet || money(t.total) - money(t.fee),
        );
    }
  }

  for (const s of settlements) {
    const toId = String(s.toAdmin || "");
    if (!toId) continue;
    const a = ensureAdmin(toId);
    if (a) a.reimbursedTotal += money(s.amount);
  }

  // owedMap: adminId -> netOwed
  const owedMap = new Map();
  let totalOwedAll = 0;

  for (const [adminId, a] of adminMap.entries()) {
    const advancedTotal = money(a.payoutAdvance) + money(a.refundAdvance);
    const netOwed = advancedTotal - money(a.reimbursedTotal);
    owedMap.set(adminId, netOwed);
    if (netOwed > 0) totalOwedAll += netOwed;
  }

  // Rule 2: no repayment allowed if total owed = 0 (including self)
  if (!(totalOwedAll > 0)) {
    return new Response(
      "No outstanding amount owed to admins. Repayment is not allowed.",
      { status: 409 },
    );
  }

  // Rule 1: cannot repay more than total owed to admins (including self)
  if (amt > totalOwedAll) {
    return new Response(
      `Amount exceeds total owed to admins (max: ${totalOwedAll}).`,
      { status: 409 },
    );
  }

  const targetId = String(toAdminId);
  const targetOwed = money(owedMap.get(targetId));

  // Optional sanity: can't repay an admin that isn't owed
  if (!(targetOwed > 0)) {
    return new Response("Selected admin is not owed any amount.", {
      status: 409,
    });
  }

  const isSelf = String(me._id) === targetId;

  const receipt = String(receiptUrl || "").trim();

  // Rule 3: receipt required ONLY if not paying self
  if (!isSelf && !receipt) {
    return new Response("Receipt URL is required", { status: 400 });
  }
  // ----- MINIMAL FIX ENDS HERE -----

  const doc = await AdminSettlement.create({
    fromAdmin: me._id,
    toAdmin: toAdminId,
    amount: amt,
    receiptUrl: receipt || "", // allow empty when self
    note: String(note || "").trim(),
  });

  return Response.json({ ok: true, id: String(doc._id) });
}
