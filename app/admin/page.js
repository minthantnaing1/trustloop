import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminLayout from "@/components/admin/AdminLayout";

export default async function AdminPage() {
  const session = await auth();
  await connectDB();

  const user = await User.findOne({ email: session.user.email });

  if (!user || user.role !== "admin") {
    redirect("/home");
  }

  const users = await User.find().lean();

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6 text-[#325082]">
        Admin Dashboard
      </h1>

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

      <section className="bg-white p-5 rounded-xl shadow-md">
        <h2 className="font-semibold mb-4 text-[#325082]">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Email</th>
                <th className="p-2 border-b font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
