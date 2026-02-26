// app/api/transactions/[id]/chat/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import ChatThread from "@/models/ChatThread";
import { notifyTxnEvent } from "@/lib/notify";

const MAX_KEEP_MESSAGES = 500;

async function requirePartyAndTxn(txnId) {
  const session = await auth();
  if (!session?.user?.email) {
    return { err: new Response("Unauthorized", { status: 401 }) };
  }

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(txnId)) {
    return { err: new Response("Invalid id", { status: 400 }) };
  }

  const me = await User.findOne({ email: session.user.email }).select(
    "_id role",
  );
  if (!me) return { err: new Response("User not found", { status: 404 }) };

  const txn = await Transaction.findById(txnId).select(
    "buyer seller kind status timeline sellerProofUrls sellerProofUploadedAt autoConfirmAt",
  );
  if (!txn) return { err: new Response("Not found", { status: 404 }) };

  const isParty =
    String(txn.buyer) === String(me._id) ||
    String(txn.seller) === String(me._id) ||
    me.role === "admin";

  if (!isParty) return { err: new Response("Forbidden", { status: 403 }) };

  return { me, txn };
}

function toDateSafe(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// GET /api/transactions/:id/chat?limit=60&before=ISO&after=ISO
export async function GET(req, { params }) {
  const { id } = await params;

  const { err, txn } = await requirePartyAndTxn(id);
  if (err) return err;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 60), 200);
  const before = url.searchParams.get("before");
  const after = url.searchParams.get("after");

  const thread = await ChatThread.findOne({ txn: txn._id })
    .populate({ path: "messages.by", select: "name email image" })
    .lean();

  if (!thread) {
    return Response.json({ thread: null, items: [], nextCursor: null });
  }

  const all = Array.isArray(thread.messages) ? thread.messages : [];

  // messages are stored oldest -> newest (append-only)
  let filtered = all;

  // if after is provided -> get newer messages
  if (after) {
    const a = toDateSafe(after);
    if (a) filtered = filtered.filter((m) => new Date(m.createdAt) > a);

    const items = filtered.slice(0, limit); // already ascending
    const nextCursor = items.length ? items[items.length - 1].createdAt : null;

    return Response.json({
      thread: {
        _id: thread._id,
        txn: thread.txn,
        lastMessageAt: thread.lastMessageAt,
      },
      items,
      nextCursor,
    });
  }

  // load older if before provided
  if (before) {
    const b = toDateSafe(before);
    if (b) filtered = filtered.filter((m) => new Date(m.createdAt) < b);

    const items = filtered.slice(Math.max(0, filtered.length - limit));
    const nextCursor = items.length ? items[0].createdAt : null;

    return Response.json({
      thread: {
        _id: thread._id,
        txn: thread.txn,
        lastMessageAt: thread.lastMessageAt,
      },
      items,
      nextCursor,
    });
  }

  // default initial: last limit
  const items = all.slice(Math.max(0, all.length - limit));
  const nextCursor = items.length ? items[0].createdAt : null;

  return Response.json({
    thread: {
      _id: thread._id,
      txn: thread.txn,
      lastMessageAt: thread.lastMessageAt,
    },
    items,
    nextCursor,
  });
}

// POST /api/transactions/:id/chat { text, images }
export async function POST(req, { params }) {
  const { id } = await params;

  const { err, me, txn } = await requirePartyAndTxn(id);
  if (err) return err;

  // ✅ lock chat on completed statuses (server-side safety)
  if (["BUYER_CONFIRMED", "PAID_OUT"].includes(txn.status)) {
    return new Response("Chat is closed", { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();

  const images = Array.isArray(body?.images)
    ? body.images.map((s) => String(s || "").trim()).filter(Boolean)
    : [];

  // ✅ allow text-only OR image-only
  if (!text && images.length === 0)
    return new Response("Message or images is required", { status: 400 });

  if (text.length > 1500)
    return new Response("Message too long (1500 max)", { status: 400 });

  const now = new Date();

  const msg = {
    _id: new mongoose.Types.ObjectId(),
    by: me._id,
    text,
    images, // ✅ NEW
    createdAt: now,
  };

  const previewText = text
    ? text.slice(0, 140)
    : images.length
      ? "[Image]"
      : "";

  // Ensure thread exists + push message (keep last 500)
  const thread = await ChatThread.findOneAndUpdate(
    { txn: txn._id },
    {
      $setOnInsert: { txn: txn._id, buyer: txn.buyer, seller: txn.seller },
      $set: { lastMessageAt: now, lastMessageText: previewText },
      $push: { messages: { $each: [msg], $slice: -MAX_KEEP_MESSAGES } },
    },
    { new: true, upsert: true },
  );

  // Update txn preview fields too
  await Transaction.updateOne(
    { _id: txn._id },
    {
      $set: {
        lastMessageAt: now,
        lastMessageText: previewText,
        updatedAt: now,
      },
    },
  );

  // ✅ FIRST MESSAGE → move state to DELIVERY_IN_PROGRESS
  let txnStatus = txn.status;
  if (txn.status === "PAYMENT_SUCCESSFUL" || txn.status === "SELLER_ACCEPTED") {
    txn.status = "DELIVERY_IN_PROGRESS";
    txn.timeline = Array.isArray(txn.timeline) ? txn.timeline : [];
    txn.timeline.push({ at: now, by: me._id, action: "CHAT_STARTED" });
    await txn.save();
    txnStatus = txn.status;

    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "CHAT_STARTED",
    });
  }

  // Populate sender for UI response
  const populatedBy = await User.findById(me._id)
    .select("name email image")
    .lean();

  return Response.json({
    success: true,
    txnStatus,
    message: {
      _id: msg._id,
      text: msg.text,
      images: msg.images, // ✅ NEW
      by: populatedBy || me._id,
      createdAt: msg.createdAt,
    },
    thread: {
      _id: thread._id,
      lastMessageAt: thread.lastMessageAt,
    },
  });
}
