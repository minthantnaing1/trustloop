// components/admin/TransactionsTable.client.js
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminTxnRowActions from "@/components/admin/AdminTxnRowActions";
import AdminReceiptLink from "@/components/admin/AdminReceiptLink";

function StatusPill({ status, labels }) {
  const label = labels?.[status] || status;
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
      {label}
    </span>
  );
}

export default function TransactionsTable({ labels }) {
  const sp = useSearchParams();
  const status = (sp.get("status") || "ALL").toUpperCase();

  const [txns, setTxns] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const ctrl = new AbortController();
    const qs =
      status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
    fetch(`/api/admin/transactions${qs}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (mounted) setTxns(Array.isArray(data) ? data : []);
      })
      .catch((e) => mounted && setErr(e.message || "Failed to load"));
    return () => {
      mounted = false;
      ctrl.abort();
    };
  }, [status]);

  if (err) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-md">
        <p className="text-red-600">Error: {String(err)}</p>
      </div>
    );
  }

  if (!txns) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-md">
        <p className="text-gray-500">Loading transactions…</p>
      </div>
    );
  }

  return (
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
              const txnId = t._id?.toString?.() || t._id;
              const showActions = t.status === "AWAITING_ADMIN_REVIEW";
              return (
                <tr key={txnId} className="hover:bg-gray-50 align-top">
                  <td className="p-2">
                    <div className="font-medium">{t.product?.title || "-"}</div>
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
                    {t.hasReceipt ? (
                      <AdminReceiptLink
                        url={`/api/admin/transactions/${t._id}/receipt`}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    <StatusPill status={t.status} labels={labels} />
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
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  No transactions found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
