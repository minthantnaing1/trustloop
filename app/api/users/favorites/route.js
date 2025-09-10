// app/api/users/favorites/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";

// GET /api/users/favorites -> list current user's favorites
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email })
    .populate({ path: "favorites", model: Product })
    .lean();

  return Response.json({ favorites: user?.favorites || [] });
}

// POST /api/users/favorites { productId } -> add favorite
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await req.json();
  if (!productId) {
    return Response.json({ error: "productId required" }, { status: 400 });
  }

  await connectDB();
  const prod = await Product.findById(productId).select("_id").lean();
  if (!prod) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  await User.findOneAndUpdate(
    { email: session.user.email },
    { $addToSet: { favorites: prod._id } },
    { new: true, upsert: true }
  );

  return Response.json({ ok: true });
}

// DELETE /api/users/favorites { productId } -> remove favorite
export async function DELETE(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await req.json();
  if (!productId) {
    return Response.json({ error: "productId required" }, { status: 400 });
  }

  await connectDB();
  await User.findOneAndUpdate(
    { email: session.user.email },
    { $pull: { favorites: productId } }
  );

  return Response.json({ ok: true });
}
