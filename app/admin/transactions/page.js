// app/admin/transactions/page.js
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

// client components (read ?status=... on the client)
import TxnStatusTabs from "@/components/admin/TxnStatusTabs.client";
import TransactionsTable from "@/components/admin/TransactionsTable.client";

const LABELS = {
  AWAITING_ADMIN_REVIEW: "Awaiting Review",
  ESCROW_FUNDED: "Escrow Funded",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  PENDING_UPLOAD: "Pending Upload",
  DELIVERY_IN_PROGRESS: "Delivery",
  BUYER_CONFIRMED: "Buyer Confirmed",
  PAID_OUT: "Paid Out",
};

export default async function AdminTransactionsPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  return (
    <>
      <h1 className="text-2xl font-bold mb-2 text-[#325082]">Transactions</h1>
      <TxnStatusTabs />
      <TransactionsTable labels={LABELS} />
    </>
  );
}
