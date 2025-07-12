import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";

// ✅ Get Single Product by ID
export async function GET(_req, { params }) {
  const { id } = await params; // ✅ Await added to fix CMD error

  try {
    await connectDB();
    const session = await auth();

    const product = await Product.findById(id).populate("owner");

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    const isOwner = session?.user?.email === product.owner.email;

    if (product.isHidden && !isOwner) {
      return new Response("Product not found", { status: 404 });
    }

    return new Response(JSON.stringify(product), { status: 200 });
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Delete Single Product
export async function DELETE(_req, { params }) {
  const { id } = await params; // ✅ Await added to fix CMD error

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    if (product.owner.email !== session.user.email) {
      return new Response("Unauthorized - Not your product", { status: 403 });
    }

    // ✅ Delete Cloudinary images
    for (const url of product.images || []) {
      const publicId = extractPublicId(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch {
          console.warn("⚠️ Cloudinary deletion failed for:", publicId);
        }
      }
    }

    await Product.findByIdAndDelete(id);

    return new Response("Deleted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ Product DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Update Single Product
export async function PATCH(req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    if (product.owner.email !== session.user.email) {
      return new Response("Unauthorized - Not your product", { status: 403 });
    }

    // ✅ Only perform Cloudinary deletion if `images` field is present
    if ("images" in body && Array.isArray(body.images)) {
      const removed = (product.images || []).filter(
        (url) => !body.images.includes(url)
      );

      for (const url of removed) {
        const publicId = extractPublicId(url);
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", publicId);
          }
        }
      }
    }

    Object.assign(product, body);
    await product.save();

    return new Response(JSON.stringify(product), { status: 200 });
  } catch (err) {
    console.error("❌ Product PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Minimal helper
function extractPublicId(url) {
  try {
    const path = url.split("/upload/")[1];
    return path.split("/").slice(1).join("/").split(".")[0]; // remove version + extension
  } catch {
    return null;
  }
}
