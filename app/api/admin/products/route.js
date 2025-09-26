// app/api/admin/products/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import cloudinary from "@/lib/cloudinary";

// robustly extract Cloudinary public_id from a (versioned) URL
function extractPublicId(url = "") {
  try {
    const u = new URL(url);
    // /.../upload/v1699999999/folder/name.ext  -> folder/name
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

// GET /api/admin/products
export async function GET() {
  try {
    const { error } = await ensureAdmin();
    if (error) return error;

    const docs = await Product.find({})
      .populate("owner", "name email")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const items = (docs || []).map((p) => ({
      ...p,
      _id: p._id?.toString?.() || String(p._id),
    }));

    return Response.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/products error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/admin/products   body: { ids: ["...","..."] }
export async function DELETE(req) {
  try {
    const { error } = await ensureAdmin();
    if (error) return error;

    let ids = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) ids = body.ids.filter(Boolean);
    } catch {}
    if (!ids.length) return new Response("ids[] required", { status: 400 });

    // fetch products to collect image URLs
    const prods = await Product.find(
      { _id: { $in: ids } },
      "defaultImage images.url"
    ).lean();

    // collect Cloudinary public_ids
    const publicIds = [];
    for (const p of prods) {
      if (p?.defaultImage) {
        const pid = extractPublicId(p.defaultImage);
        if (pid) publicIds.push(pid);
      }
      const arr = Array.isArray(p?.images) ? p.images : [];
      for (const it of arr) {
        const pid = extractPublicId(it?.url || "");
        if (pid) publicIds.push(pid);
      }
    }

    // best-effort destroy
    await Promise.allSettled(
      publicIds.map((pid) =>
        cloudinary.uploader.destroy(pid).catch((e) => {
          console.warn("cloudinary destroy failed:", pid, e?.message);
        })
      )
    );

    await Product.deleteMany({ _id: { $in: ids } });

    return Response.json({
      ok: true,
      deleted: ids.length,
      imagesDeleted: publicIds.length,
    });
  } catch (e) {
    console.error("DELETE /api/admin/products error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}
