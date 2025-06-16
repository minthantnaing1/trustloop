// app/api/products/route.js
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";

export async function POST(req) {
  try {
    const data = await req.json();
    await connectDB();
    const created = await Product.create(data);
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
