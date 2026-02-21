// app/api/users/[id]/route.js
export const runtime = "nodejs";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/auth";
import cloudinary from "@/lib/cloudinary";

// ✅ helpers (match your product style)
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

function isDataUrlImage(v = "") {
  return typeof v === "string" && v.startsWith("data:image/");
}

function isCloudinaryUrl(v = "") {
  return (
    typeof v === "string" && v.includes("/upload/") && v.includes("cloudinary")
  );
}

// ✅ Get User By ID
export async function GET(_req, { params }) {
  const { id } = await params;

  try {
    await connectDB();
    const user = await User.findById(id);

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (err) {
    console.error("❌ User GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Delete User (Admin only)
export async function DELETE(_req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (session.user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    await User.findByIdAndDelete(id);
    return new Response("Deleted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ User DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Update User (Owner or Admin)
export async function PATCH(req, { params }) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Allow only owner or admin
    if (session.user.email !== user.email && session.user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    // ✅ Upload + delete old profile image if replaced/removed
    if (Object.prototype.hasOwnProperty.call(body, "image")) {
      const incoming = body.image;

      // Replace with new upload
      if (isDataUrlImage(incoming)) {
        const oldUrl = user.image || "";

        const result = await cloudinary.uploader.upload(incoming, {
          folder: "trustloop/users/profile",
          resource_type: "image",
        });

        body.image = result.secure_url;

        const oldPublicId = extractPublicId(oldUrl);
        if (
          isCloudinaryUrl(oldUrl) &&
          oldPublicId &&
          oldUrl !== result.secure_url
        ) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, {
              resource_type: "image",
            });
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", oldPublicId);
          }
        }
      }

      // Reset to default -> delete old cloudinary asset
      if (incoming === "/default-profile.jpg") {
        const oldUrl = user.image || "";
        const oldPublicId = extractPublicId(oldUrl);

        if (isCloudinaryUrl(oldUrl) && oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, {
              resource_type: "image",
            });
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", oldPublicId);
          }
        }
      }
    }

    // ✅ Upload + delete old QR image if replaced/cleared
    if (Object.prototype.hasOwnProperty.call(body, "defaultScanCode")) {
      const incoming = body.defaultScanCode;

      if (isDataUrlImage(incoming)) {
        const oldUrl = user.defaultScanCode || "";

        const result = await cloudinary.uploader.upload(incoming, {
          folder: "trustloop/users/scan_codes",
          resource_type: "image",
        });

        body.defaultScanCode = result.secure_url;

        const oldPublicId = extractPublicId(oldUrl);
        if (
          isCloudinaryUrl(oldUrl) &&
          oldPublicId &&
          oldUrl !== result.secure_url
        ) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, {
              resource_type: "image",
            });
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", oldPublicId);
          }
        }
      }

      // Cleared -> delete old cloudinary asset
      if (incoming === "" || incoming == null) {
        const oldUrl = user.defaultScanCode || "";
        const oldPublicId = extractPublicId(oldUrl);

        if (isCloudinaryUrl(oldUrl) && oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId, {
              resource_type: "image",
            });
          } catch {
            console.warn("⚠️ Cloudinary deletion failed for:", oldPublicId);
          }
        }
      }
    }

    const allowedFields = [
      "name",
      "image",
      "phone",
      "faculty",
      "year",
      "location",
      "defaultScanCode",
      "bankAccountName",
      "bankAccountNumber",
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const val = body[field];
        if (typeof val === "string" && val.trim() === "") {
          // treat blank string as "unset"
          user[field] = undefined;
        } else {
          user[field] = val;
        }
      }
    });

    await user.save();
    return new Response(JSON.stringify(user), { status: 200 });
  } catch (err) {
    console.error("❌ User PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
