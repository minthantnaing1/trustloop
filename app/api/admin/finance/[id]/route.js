// app/api/admin/finance/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminSettlement from "@/models/AdminSettlement";
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

// DELETE /api/admin/finance/:id
export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();
    const me = await User.findOne({ email: session.user.email }).select(
      "_id role adminRank",
    );
    if (!me || me.role !== "admin")
      return new Response("Forbidden", { status: 403 });

    // ✅ Only Stripe owner (DEVELOPER) can delete repayment records
    const isDeveloper = String(me.adminRank || "NORMAL") === "DEVELOPER";
    if (!isDeveloper) {
      return new Response("Only Stripe owner can delete repayments.", {
        status: 403,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    const s = await AdminSettlement.findById(id).select("receiptUrl");
    if (!s) return new Response("Not found", { status: 404 });

    const pid = s.receiptUrl ? extractPublicId(s.receiptUrl) : null;
    if (pid) {
      try {
        await cloudinary.uploader.destroy(pid);
      } catch (e) {
        console.warn("cloudinary destroy failed:", pid, e?.message);
      }
    }

    await AdminSettlement.deleteOne({ _id: id });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/finance/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
