import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Link from "next/link";

export default async function AdminProductsPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  const products = await Product.find()
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#325082]">Manage Products</h1>
        <Link href="/admin" className="text-sm text-[#325082] underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium">Title</th>
                <th className="p-2 border-b font-medium">Price</th>
                <th className="p-2 border-b font-medium">Category</th>
                <th className="p-2 border-b font-medium">Owner</th>
                <th className="p-2 border-b font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="p-2">{p.title}</td>
                  <td className="p-2">฿{Number(p.price).toLocaleString()}</td>
                  <td className="p-2 capitalize">{p.category}</td>
                  <td className="p-2">
                    {p.owner?.name || p.owner?.email || "-"}
                  </td>
                  <td className="p-2">
                    {p.isAvailable ? (
                      <span className="text-green-600 font-semibold">
                        Visible
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">Hidden</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
