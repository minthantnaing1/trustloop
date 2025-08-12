// app/admin/transactions/page.js
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import AdminTxnRowActions from "@/components/admin/AdminTxnRowActions";
import AdminReceiptLink from "@/components/admin/AdminReceiptLink";
import Link from "next/link";

export const runtime = "nodejs"; // force Node (not Edge)
export const dynamic = "force-dynamic"; // never statically optimize
export const revalidate = 0; // no ISR cache
export const fetchCache = "default-no-store"; // avoid route cache

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

function StatusPill({ status }) {
  const color =
    status === "AWAITING_ADMIN_REVIEW"
      ? "bg-yellow-100 text-yellow-700"
      : status === "ESCROW_FUNDED"
      ? "bg-green-100 text-green-700"
      : status === "REJECTED" || status === "CANCELLED"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      {LABELS[status] || status}
    </span>
  );
}

function Tabs({ active }) {
  const tab = (label, val) => (
    <Link
      prefetch={false}
      href={`/admin/transactions${val ? `?status=${val}` : ""}`}
      className={`px-4 py-1.5 rounded-md text-sm border ${
        active === (val || "ALL")
          ? "bg-[#325082] text-white border-[#325082]"
          : "bg-white text-[#325082] border-[#325082]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex gap-2 mb-4">
      {tab("All", "ALL")}
      {tab("Awaiting", "AWAITING_ADMIN_REVIEW")}
      {tab("Verified", "ESCROW_FUNDED")}
      {tab("Rejected", "REJECTED")}
      {tab("Cancelled", "CANCELLED")}
    </div>
  );
}

export default async function AdminTransactionsPage({ searchParams }) {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  // Default to ALL
  const statusParam = (await searchParams)?.status || "ALL";
  const match =
    statusParam === "ALL" ? {} : { status: statusParam.toUpperCase() };

  const txns = await Transaction.find(match)
    .sort({ updatedAt: -1 })
    .limit(200)
    .populate({ path: "product", select: "title price defaultImage" })
    .populate({ path: "buyer", select: "email name" })
    .populate({ path: "seller", select: "email name" })
    .lean();

  return (
    <>
      <h1 className="text-2xl font-bold mb-2 text-[#325082]">Transactions</h1>
      <Tabs active={(statusParam || "ALL").toUpperCase()} />

      <div className="bg-white p-5 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium">Product</th>
                <th className="p-2 border-b font-medium">Buyer</th>
                <th className="p-2 border-b font-medium">Seller</th>
                <th className="p-2 border-b font-medium">Total</th>
                <th className="p-2 border-b font-medium">Uploaded</th>
                <th className="p-2 border-b font-medium">Receipt</th>
                <th className="p-2 border-b font-medium">Status</th>
                <th className="p-2 border-b font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const txnId = t._id?.toString();
                const showActions = t.status === "AWAITING_ADMIN_REVIEW"; // <-- only show buttons then
                return (
                  <tr key={txnId} className="hover:bg-gray-50 align-top">
                    <td className="p-2">
                      <div className="font-medium">
                        {t.product?.title || "-"}
                      </div>
                    </td>
                    <td className="p-2">
                      {t.buyer?.email || t.buyer?.name || "-"}
                    </td>
                    <td className="p-2">
                      {t.seller?.email || t.seller?.name || "-"}
                    </td>
                    <td className="p-2">฿{Number(t.total).toLocaleString()}</td>
                    <td className="p-2">
                      {new Date(t.updatedAt || t.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">
                      <AdminReceiptLink
                        dataUrl={t.buyerPaymentReceiptB64 || ""}
                      />
                    </td>
                    <td className="p-2">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="p-2">
                      {showActions ? (
                        <AdminTxnRowActions txnId={txnId} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!txns.length && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    No transactions found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
