// app/api/admin/transactions/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import cloudinary from "@/lib/cloudinary";

function extractPublicId(url = "") {
  try {
    // Handles: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg
    const afterUpload = url.split("/upload/")[1];
    // Drop version + extension
    return afterUpload
      .split("/")
      .slice(1)
      .join("/")
      .replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

// GET /api/admin/transactions?status=ALL|AWAITING_ADMIN_REVIEW|...
export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    // keep ObjectId (no .lean() yet)
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role"
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    // best-effort sweep (never fail the page)
    try {
      const now = new Date();
      await Transaction.updateMany(
        { status: "PENDING_UPLOAD", expiresAt: { $lte: now } },
        { $set: { status: "CANCELLED", updatedAt: now } }
      );
    } catch (sweepErr) {
      console.warn("transactions sweep skipped:", sweepErr?.message);
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get("status") || "ALL").toUpperCase();
    const match = statusParam === "ALL" ? {} : { status: statusParam };

    const docs = await Transaction.find(match)
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate({ path: "product", select: "title price defaultImage" })
      .populate({ path: "buyer", select: "email name" })
      .populate({ path: "seller", select: "email name" })
      .lean();

    const items = (docs || []).map((t) => ({
      ...t,
      _id: t._id?.toString?.() || String(t._id),
      hasReceipt: Boolean(t.buyerReceiptUrl),
    }));

    return Response.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/admin/transactions   body: { ids: ["...","..."] }
export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role"
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    let ids = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) ids = body.ids.filter(Boolean);
    } catch {}
    if (!ids.length) return new Response("ids[] required", { status: 400 });

    // fetch only what we need
    const txns = await Transaction.find(
      { _id: { $in: ids } },
      "buyerReceiptUrl"
    ).lean();

    // delete Cloudinary receipts (best effort)
    await Promise.allSettled(
      txns.map(async (t) => {
        const pid = extractPublicId(t.buyerReceiptUrl);
        if (pid) {
          try {
            await cloudinary.uploader.destroy(pid);
          } catch (e) {
            console.warn("cloudinary destroy failed:", pid, e?.message);
          }
        }
      })
    );

    // delete from Mongo
    await Transaction.deleteMany({ _id: { $in: ids } });

    return Response.json({ ok: true, deleted: ids.length });
  } catch (e) {
    console.error("DELETE /api/admin/transactions error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
