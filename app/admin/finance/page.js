// app/admin/finance/page.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminFinanceClient from "./AdminFinanceClient";

export default async function AdminFinancePage() {
  await connectDB();
  const session = await auth();

  if (!session?.user?.email) redirect("/");

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();
  if (!me || me.role !== "admin") redirect("/home");

  return <AdminFinanceClient />;
}
