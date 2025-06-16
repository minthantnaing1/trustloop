// app/api/products/route.js
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const created = await Product.create({
      ...body,
      owner: user._id, // 👈 required by schema
    });

    return new Response(JSON.stringify(created), { status: 201 });
  } catch (err) {
    console.error("❌ Product POST error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({ isAvailable: true }).sort({
      createdAt: -1,
    });
    return new Response(JSON.stringify(products), { status: 200 });
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
