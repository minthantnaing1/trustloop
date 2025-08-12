import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Link from "next/link";

export default async function AdminUsersPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  const users = await User.find().sort({ createdAt: -1 }).lean();

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#325082]">Manage Users</h1>
        <Link href="/admin" className="text-sm text-[#325082] underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Email</th>
                <th className="p-2 border-b font-medium">Role</th>
                <th className="p-2 border-b font-medium">Credits</th>
                <th className="p-2 border-b font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="p-2">{u.name || "-"}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                  <td className="p-2">{u.postingCredits ?? 0}</td>
                  <td className="p-2">
                    {new Date(u.createdAt).toLocaleDateString()}
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
