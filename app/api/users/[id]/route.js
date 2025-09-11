import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/auth";

// ✅ Get User By ID
export async function GET(_, { params }) {
  try {
    await connectDB();
    const user = await User.findById(params.id);

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
export async function DELETE(_, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    await connectDB();
    const user = await User.findById(params.id);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (session.user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    await User.findByIdAndDelete(params.id);
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
      if (body[field] !== undefined) {
        user[field] = body[field];
      }
    });

    await user.save();
    return new Response(JSON.stringify(user), { status: 200 });
  } catch (err) {
    console.error("❌ User PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
