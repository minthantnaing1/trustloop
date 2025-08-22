export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import cloudinary from "@/lib/cloudinary";
import mongoose from "mongoose";

function extractPublicId(url = "") {
  try {
    const afterUpload = url.split("/upload/")[1];
    return afterUpload
      .split("/")
      .slice(1)
      .join("/")
      .replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

// PATCH /api/admin/transactions/:id  { op: "verify" | "reject", reason?: string }
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role"
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    let op,
      reason = "";
    try {
      const body = await req.json();
      op = body?.op;
      reason = body?.reason || "";
    } catch {}
    const url = new URL(req.url);
    op = op ?? url.searchParams.get("op");
    reason = reason || url.searchParams.get("reason") || "";

    if (!op)
      return new Response("Missing 'op' (verify|reject).", { status: 400 });

    // include product so we can toggle availability
    const txn = await Transaction.findById(id).populate("product");
    if (!txn) return new Response("Not found", { status: 404 });

    const prevStatus = txn.status;

    if (op === "verify") {
      if (!txn.buyerReceiptUrl)
        return new Response("No buyer receipt uploaded.", { status: 409 });

      // ✅ clear any previous reject reason
      txn.adminRejectReason = "";

      txn.status = "ESCROW_FUNDED";
      txn.timeline.push({
        by: me._id,
        at: new Date(),
        action: "ADMIN_VERIFIED_PAYMENT",
        meta: { via: "url" },
      });
      txn.updatedAt = new Date();
      await txn.save();

      // lock product after funding
      if (txn.product?._id) {
        await Product.updateOne(
          { _id: txn.product._id },
          { $set: { isAvailable: false } }
        );
      }

      return Response.json({ ok: true, status: txn.status });
    }

    if (op === "reject") {
      txn.status = "REJECTED_BY_ADMIN"; // <-- updated
      txn.adminRejectReason = reason || txn.adminRejectReason || "";
      txn.timeline.push({
        by: me._id,
        at: new Date(),
        action: "REJECTED_BY_ADMIN", // <-- updated
        meta: reason ? { reason } : undefined,
      });
      txn.updatedAt = new Date();
      await txn.save();

      // Re-open the product for sale
      if (txn.product?._id) {
        await Product.updateOne(
          { _id: txn.product._id },
          { $set: { isAvailable: true } }
        );
      }

      return Response.json({ ok: true, status: txn.status });
    }

    return new Response("Unsupported op. Use 'verify' or 'reject'.", {
      status: 400,
    });
  } catch (e) {
    console.error("PATCH /api/admin/transactions/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/admin/transactions/:id
export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role"
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    const txn = await Transaction.findById(id, "buyerReceiptUrl");
    if (!txn) return new Response("Not found", { status: 404 });

    const pid = extractPublicId(txn.buyerReceiptUrl);
    if (pid) {
      try {
        await cloudinary.uploader.destroy(pid);
      } catch (e) {
        console.warn("cloudinary destroy failed:", pid, e?.message);
      }
    }

    await Transaction.deleteOne({ _id: id });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/transactions/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
