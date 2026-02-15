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
    "_id role name email",
  );
  if (!me || me.role !== "admin")
    return new Response("Forbidden", { status: 403 });

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

  // Admin list (for settlement dropdown)
  const admins = await User.find({ role: "admin" })
    .select("_id name email role")
    .lean();

  // Settlement history
  const settlements = await AdminSettlement.find()
    .populate("fromAdmin", "name email")
    .populate("toAdmin", "name email")
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

    // refund outstanding: cancelled + payment succeeded + not yet refunded
    const isCancelled =
      t.status === "CANCELLED_BY_BUYER" || t.status === "CANCELLED_BY_SELLER";
    const isOutstandingRefund =
      isCancelled && !!t.hasPaymentSucceeded && !t.adminRefundReceiptUrl;

    if (isOutstandingPayout) outstandingPayoutTotal += money(t.sellerNet);
    if (isOutstandingRefund)
      outstandingRefundTotal += money(t.buyerRefundNet || t.total - t.fee);

    // who advanced?
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
  // advanced payouts/refunds grouped per admin
  const adminMap = new Map(); // adminId -> ledger

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

  // from transactions timeline actors
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

  // settlement reimbursements grouped by toAdmin
  for (const s of settlements) {
    const toId = String(s.toAdmin?._id || s.toAdmin);
    if (!toId) continue;
    const a = ensureAdmin(toId);
    a.reimbursedTotal += money(s.amount);
  }

  // finalize totals
  for (const a of adminMap.values()) {
    a.advancedTotal = money(a.payoutAdvance) + money(a.refundAdvance);
    a.netOwed = money(a.advancedTotal) - money(a.reimbursedTotal);
  }

  // attach admin info (name/email)
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
    // show those who are owed money first
    .sort((x, y) => money(y.netOwed) - money(x.netOwed));

  return Response.json({
    ok: true,
    summary: {
      incomingTotal,
      stripeFeesTotal,
      leftAfterStripeTotal,
      profitTotal,
      outstandingPayoutTotal,
      outstandingRefundTotal,
    },
    rows,
    admins: admins.map((a) => ({
      _id: String(a._id),
      name: a.name,
      email: a.email,
    })),
    adminLedger,
    settlements: settlements.map((s) => ({
      _id: String(s._id),
      fromAdmin: s.fromAdmin
        ? {
            _id: String(s.fromAdmin._id),
            name: s.fromAdmin.name,
            email: s.fromAdmin.email,
          }
        : null,
      toAdmin: s.toAdmin
        ? {
            _id: String(s.toAdmin._id),
            name: s.toAdmin.name,
            email: s.toAdmin.email,
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
    "_id role",
  );
  if (!me || me.role !== "admin")
    return new Response("Forbidden", { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { toAdminId, amount, receiptUrl, note } = body;

  if (!toAdminId || !mongoose.Types.ObjectId.isValid(toAdminId)) {
    return new Response("Invalid toAdminId", { status: 400 });
  }

  const amt = money(amount);
  if (!(amt > 0)) return new Response("Amount must be > 0", { status: 400 });

  const doc = await AdminSettlement.create({
    fromAdmin: me._id,
    toAdmin: toAdminId,
    amount: amt,
    receiptUrl: String(receiptUrl || "").trim(),
    note: String(note || "").trim(),
  });

  return Response.json({ ok: true, id: String(doc._id) });
}
