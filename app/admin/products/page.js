// app/admin/products/page.js
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import AdminProductsClient from "./AdminProductsClient";

export default async function AdminProductsPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).select("role");
  if (!me || me.role !== "admin") redirect("/home");

  const docs = await Product.find({})
    .populate("owner", "name email")
    .sort({ updatedAt: -1 });

  // ✅ Convert to plain JSON so it’s safe to pass to a Client Component
  const initialProducts = JSON.parse(JSON.stringify(docs));

  return <AdminProductsClient initialProducts={initialProducts} />;
}
