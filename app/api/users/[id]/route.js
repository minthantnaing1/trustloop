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

// ✅ Delete User (Probably not used, but for admin)
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

    await User.findByIdAndDelete(params.id);
    return new Response("Deleted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ User DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Update User
export async function PATCH(req, { params }) {
  try {
    const body = await req.json();
    await connectDB();

    const user = await User.findById(params.id);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    Object.assign(user, body);
    await user.save();

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (err) {
    console.error("❌ User PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
