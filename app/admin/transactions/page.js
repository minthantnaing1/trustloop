// app/admin/transactions/page.js
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

  // 1) All admins that can receive money (have defaultScanCode)
  const admins = await User.find({
    role: "admin",
    defaultScanCode: { $exists: true, $ne: "" },
  })
    .select("name email defaultScanCode createdAt")
    .sort({ createdAt: 1 })
    .lean();

  // simple deterministic hash → index into admins[]
  function pickAdminForTxn(txn) {
    if (!admins.length || !txn?._id) return null;
    const idStr = String(txn._id);
    let sum = 0;
    for (let i = 0; i < idStr.length; i++) {
      sum += idStr.charCodeAt(i);
    }
    const idx = sum % admins.length;
    return admins[idx] || null;
  }

  // 2) Load txns (plain objects)
  const txns = await Transaction.find()
    .populate("buyer")
    .populate("seller")
    .populate("product")
    .sort({ createdAt: -1 })
    .lean();

  // 3) Attach payAdmin snapshot to each txn
  const txnsWithAdmin = txns.map((t) => ({
    ...t,
    payAdmin: pickAdminForTxn(t),
  }));

  // ✅ Strip ObjectIds / toJSON stuff so it's safe for client component
  const safeInitialTxns = JSON.parse(JSON.stringify(txnsWithAdmin));

  return <AdminTransactionsClient initialTxns={safeInitialTxns} />;
}
