import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import StatusPill from "@/components/StatusPill";

export default async function AdminPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  const [users, products, recentTxns] = await Promise.all([
    User.find().lean(),
    Product.find().populate("owner", "name email").lean(),
    Transaction.find()
      .populate("product", "title")
      .populate("buyer", "email name")
      .populate("seller", "email name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  // Transaction KPI helpers (for the last 50 loaded)
  const tByStatus = (s) => recentTxns.filter((t) => t.status === s).length;

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-[#325082]">
        Admin Dashboard
      </h1>

      {/* Users – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-3xl font-bold">
            {users.filter((u) => u.role === "admin").length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Regular Users</p>
          <p className="text-3xl font-bold">
            {users.filter((u) => u.role === "user").length}
          </p>
        </div>
      </section>

      {/* Users – Table */}
      <section className="bg-white p-5 rounded-xl shadow-md mb-8">
        <h2 className="font-semibold mb-4 text-[#325082]">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium w-10 text-center">#</th>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Email</th>
                <th className="p-2 border-b font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="p-2 text-center text-gray-600">{idx + 1}</td>
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Products – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Available Products</p>
          <p className="text-3xl font-bold">
            {products.filter((p) => p.isAvailable).length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Hidden Products</p>
          <p className="text-3xl font-bold">
            {products.filter((p) => p.isHidden).length}
          </p>
        </div>
      </section>

      {/* Products – Table */}
      <section className="bg-white p-5 rounded-xl shadow-md mt-8">
        <h2 className="font-semibold mb-4 text-[#325082]">All Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium w-10 text-center">#</th>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Price</th>
                <th className="p-2 border-b font-medium">Category</th>
                <th className="p-2 border-b font-medium">Owner</th>
                <th className="p-2 border-b font-medium">Availability</th>
                <th className="p-2 border-b font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="p-2 text-center text-gray-600">{idx + 1}</td>
                  <td className="p-2">{p.title}</td>
                  <td className="p-2">฿{Number(p.price).toLocaleString()}</td>
                  <td className="p-2 capitalize">{p.category}</td>
                  <td className="p-2">
                    {p.owner?.name || p.owner?.email || "Unknown"}
                  </td>
                  <td className="p-2">
                    {p.isAvailable ? (
                      <span className="text-green-600 font-semibold">
                        Available
                      </span>
                    ) : (
                      <span className="text-red-500 font-semibold">
                        Unavailable
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {p.isHidden ? (
                      <span className="text-red-500 font-semibold">Hidden</span>
                    ) : (
                      <span className="text-green-600 font-semibold">
                        Visible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transactions – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-5 gap-6 my-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Recent Transactions (last 50)</p>
          <p className="text-3xl font-bold">{recentTxns.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Awaiting Review</p>
          <p className="text-3xl font-bold">
            {tByStatus("AWAITING_ADMIN_REVIEW")}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Escrow Funded</p>
          <p className="text-3xl font-bold">{tByStatus("ESCROW_FUNDED")}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Buyer Received Item</p>
          <p className="text-3xl font-bold">{tByStatus("BUYER_CONFIRMED")}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Paid Out</p>
          <p className="text-3xl font-bold">{tByStatus("PAID_OUT")}</p>
        </div>
      </section>

      {/* Transactions – Table */}
      <section className="bg-white p-5 rounded-xl shadow-md">
        <h2 className="font-semibold mb-4 text-[#325082]">
          Recent Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium w-10 text-center">#</th>
                <th className="p-2 border-b font-medium">Product</th>
                <th className="p-2 border-b font-medium">Buyer</th>
                <th className="p-2 border-b font-medium">Seller</th>
                <th className="p-2 border-b font-medium">Total</th>
                <th className="p-2 border-b font-medium">Status</th>
                <th className="p-2 border-b font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTxns.map((t, idx) => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="p-2 text-center text-gray-600">{idx + 1}</td>
                  <td className="p-2">{t.product?.title || "-"}</td>
                  <td className="p-2">
                    {t.buyer?.email || t.buyer?.name || "-"}
                  </td>
                  <td className="p-2">
                    {t.seller?.email || t.seller?.name || "-"}
                  </td>
                  <td className="p-2">฿{Number(t.total).toLocaleString()}</td>
                  <td className="p-2">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="p-2">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
