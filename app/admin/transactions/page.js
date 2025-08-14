import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Transaction from "@/models/Transaction";
import AdminTxnRowActions from "@/components/admin/AdminTxnRowActions";

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

export default async function AdminTransactionsPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  // IMPORTANT: fetch like dashboard — no heavy fields
  const txns = await Transaction.find({}, "-buyerPaymentReceiptB64") // ⬅ exclude the big base64
    .populate({ path: "product", select: "title price" })
    .populate({ path: "buyer", select: "email name" })
    .populate({ path: "seller", select: "email name" })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 text-[#325082]">Transactions</h1>

      <section className="bg-white p-5 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium">Product</th>
                <th className="p-2 border-b font-medium">Buyer</th>
                <th className="p-2 border-b font-medium">Seller</th>
                <th className="p-2 border-b font-medium">Total</th>
                <th className="p-2 border-b font-medium">Updated</th>
                <th className="p-2 border-b font-medium">Status</th>
                <th className="p-2 border-b font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const txnId = t._id?.toString();
                const showActions = t.status === "AWAITING_ADMIN_REVIEW";
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
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
