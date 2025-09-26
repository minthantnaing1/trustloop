import AdminTransactionsClient from "./AdminTransactionsClient";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";

export default async function AdminTransactionsPage() {
  await connectDB();
  const session = await auth();

  if (!session?.user?.email) {
    return <p className="text-red-600">Unauthorized</p>;
  }

  const txns = await Transaction.find()
    .populate("buyer")
    .populate("seller")
    .populate("product")
    .sort({ createdAt: -1 });

  // ✅ Convert mongoose docs to plain JSON
  const initialTxns = JSON.parse(JSON.stringify(txns));

  return <AdminTransactionsClient initialTxns={initialTxns} />;
}
