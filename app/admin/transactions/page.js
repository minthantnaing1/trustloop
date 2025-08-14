// app/admin/transactions/page.js
"use client";

import { useEffect, useState } from "react";
import AdminTxnRowActions from "@/components/admin/AdminTxnRowActions";
import AdminReceiptLink from "@/components/admin/AdminReceiptLink";

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

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();

    fetch("/api/admin/transactions", { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          if (typeof window !== "undefined") window.location.href = "/home";
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (mounted) setTxns(Array.isArray(data) ? data : []);
      })
      .catch(
        (e) => mounted && setErr(e.message || "Failed to load transactions")
      );

    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-4 text-[#325082]">Transactions</h1>

      <div className="bg-white p-5 rounded-xl shadow-md">
        {err && <p className="text-red-600 mb-2">Error: {String(err)}</p>}
        {!txns && !err && (
          <p className="text-gray-500">Loading transactions…</p>
        )}

        {txns && (
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
                  const txnId = t._id?.toString?.() || t._id;
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
                      <td className="p-2">
                        ฿{Number(t.total).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {new Date(t.updatedAt || t.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {/* Prefer Cloudinary URL; legacy base64 fetched on demand via receiptId */}
                        {t.buyerReceiptUrl || t.hasReceipt ? (
                          <AdminReceiptLink
                            url={t.buyerReceiptUrl}
                            receiptId={txnId}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <StatusPill status={t.status} />
                      </td>
                      <td className="p-2">
                        {showActions ? (
                          <AdminTxnRowActions
                            txnId={txnId}
                            onDone={({ id, newStatus }) => {
                              // optimistic update: change status and hide buttons for that row
                              setTxns((prev) =>
                                prev.map((row) =>
                                  (row._id?.toString?.() || row._id) === id
                                    ? {
                                        ...row,
                                        status: newStatus,
                                        updatedAt: new Date().toISOString(),
                                      }
                                    : row
                                )
                              );
                            }}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!txns.length && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
