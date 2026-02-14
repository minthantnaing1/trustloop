// app/admin/transactions/page.js
import AdminTransactionsClient from "./AdminTransactionsClient";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminTransactionsPage() {
  await connectDB();
  const session = await auth();

  if (!session?.user?.email) redirect("/");

  // ✅ Admin gate (recommended, consistent with other admin pages)
  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();
  if (!me || me.role !== "admin") redirect("/home");

  const txns = await Transaction.find()
    .populate("buyer")
    .populate("seller")
    .populate("product")
    .sort({ createdAt: -1 })
    .lean();

  const safeInitialTxns = JSON.parse(JSON.stringify(txns));

  return <AdminTransactionsClient initialTxns={safeInitialTxns} />;
}
