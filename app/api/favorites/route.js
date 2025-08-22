import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 }); // ✅ JSON, not HTML
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email })
    .populate({ path: "favorites", model: Product })
    .lean();
  return Response.json({ favorites: user?.favorites || [] });
}

export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { productId } = await req.json();
  if (!productId) return Response.json({ error: "productId required" }, { status: 400 });

  await connectDB();
  const prod = await Product.findById(productId).select("_id").lean();
  if (!prod) return Response.json({ error: "Product not found" }, { status: 404 });

  await User.findOneAndUpdate(
    { email: session.user.email },
    { $addToSet: { favorites: prod._id } },
    { new: true, upsert: true }
  );
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { productId } = await req.json();
  if (!productId) return Response.json({ error: "productId required" }, { status: 400 });

  await connectDB();
  await User.findOneAndUpdate(
    { email: session.user.email },
    { $pull: { favorites: productId } }
  );
  return Response.json({ ok: true });
}
