// app/api/admin/products/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import cloudinary from "@/lib/cloudinary";
import mongoose from "mongoose";

function extractPublicId(url = "") {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/upload/")[1]?.split("/") || [];
    const withoutVersion = parts[0]?.match(/^v\d+$/) ? parts.slice(1) : parts;
    const joined = withoutVersion.join("/");
    return joined.replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.email)
    return { error: new Response("Unauthorized", { status: 401 }) };
  await connectDB();
  const me = await User.findOne({ email: session.user.email }).select(
    "_id role"
  );
  if (!me || me.role !== "admin")
    return { error: new Response("Forbidden", { status: 403 }) };
  return { me };
}

// DELETE /api/admin/products/:id
export async function DELETE(_req, { params }) {
  try {
    const { error } = await ensureAdmin();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return new Response("Invalid id", { status: 400 });

    const prod = await Product.findById(id).select("defaultImage images.url");
    if (!prod) return new Response("Not found", { status: 404 });

    const publicIds = [];
    if (prod.defaultImage) {
      const pid = extractPublicId(prod.defaultImage);
      if (pid) publicIds.push(pid);
    }
    const arr = Array.isArray(prod.images) ? prod.images : [];
    for (const it of arr) {
      const pid = extractPublicId(it?.url || "");
      if (pid) publicIds.push(pid);
    }

    await Promise.allSettled(
      publicIds.map((pid) =>
        cloudinary.uploader.destroy(pid).catch((e) => {
          console.warn("cloudinary destroy failed:", pid, e?.message);
        })
      )
    );

    await Product.deleteOne({ _id: id });

    return Response.json({ ok: true, imagesDeleted: publicIds.length });
  } catch (e) {
    console.error("DELETE /api/admin/products/[id] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
