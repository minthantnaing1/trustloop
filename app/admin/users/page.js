// app/admin/users/page.js
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  const docs = await User.find().sort({ createdAt: -1 }).lean();

  // ✅ Convert to plain JSON so it’s safe to pass to a Client Component
  const initialUsers = JSON.parse(JSON.stringify(docs));

  return <AdminUsersClient initialUsers={initialUsers} />;
}
