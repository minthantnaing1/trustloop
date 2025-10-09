// app/admin/transactions/AdminTransactionsClient.js
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminTxnRowActions from "@/components/admin/AdminTxnRowActions";
import SlipLink from "@/components/SlipLink";
import ConfirmModal from "@/components/ConfirmModal";
import TxnToolbar from "@/components/admin/TxnToolbar";
import StatusPill from "@/components/StatusPill";
import ActionButton from "@/components/ActionButton";
import { TrashIcon, PhoneIcon } from "@heroicons/react/24/solid";

export default function AdminTransactionsClient({ initialTxns }) {
  const router = useRouter();

  const [txns, setTxns] = useState(initialTxns || []);
  const [err, setErr] = useState("");

  // UI state
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const filtered = useMemo(() => {
    if (!Array.isArray(txns)) return [];
    if (statusFilter === "ALL") return txns;
    return txns.filter((t) => t.status === statusFilter);
  }, [txns, statusFilter]);

  async function deleteTxn(id) {
    try {
      const res = await fetch(`/api/admin/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setTxns((prev) =>
        prev.filter((r) => (r._id?.toString?.() || r._id) !== id)
      );
    } catch (e) {
      alert(e.message || "Failed to delete transaction");
    }
  }

  function askDelete(id) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  function MethodTag({ method }) {
    if (!method) return <span className="text-gray-400">—</span>;
    const label =
      method === "DELIVERY"
        ? "Delivery"
        : method === "MEETUP"
        ? "Meetup"
        : method;
    const tone =
      method === "DELIVERY"
        ? "ring-indigo-200/70 bg-indigo-50/60 text-indigo-700"
        : "ring-emerald-200/70 bg-emerald-50/60 text-emerald-700";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
      >
        {label}
      </span>
    );
  }

  function TypeTag({ kind }) {
    if (!kind) return <span className="text-gray-400">—</span>;
    const up = String(kind).toUpperCase();
    const label = up === "DONATION" ? "Donation" : "Buy/Sell";
    const tone =
      up === "DONATION"
        ? "ring-pink-200/70 bg-pink-50/70 text-pink-700"
        : "ring-sky-200/70 bg-sky-50/70 text-sky-700";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
      >
        {label}
      </span>
    );
  }

  function TypeAndMethod({ kind, method }) {
    return (
      <div className="leading-tight flex flex-col gap-1 items-start">
        <TypeTag kind={kind} />
        <MethodTag method={method} />
      </div>
    );
  }

  function Thumb({ product }) {
    const src =
      product?.defaultImage ||
      (Array.isArray(product?.images) && product.images[0]) ||
      "/placeholder.png";
    const alt = product?.title || "Product";
    return (
      <div className="w-[44px] h-[44px] rounded-[4px] ring-1 ring-gray-200 overflow-hidden bg-white">
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  function fmtTotal(t) {
    const kind = String(t?.kind || t?.type || "").toUpperCase();
    if (kind === "DONATION") return "Free";
    return `฿${Number(t.total || 0).toLocaleString()}`;
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#325082] mb-2">Transactions</h1>

      <TxnToolbar
        className="mb-1"
        statusFilter={statusFilter}
        onChangeFilter={setStatusFilter}
        editMode={editMode}
        deleteMode={deleteMode}
        onToggleEdit={() => {
          const next = !editMode;
          setEditMode(next);
          if (next) setDeleteMode(false);
        }}
        onToggleDelete={() => {
          const next = !deleteMode;
          setDeleteMode(next);
          if (next) setEditMode(false);
        }}
      />

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
                  <th className="p-2 border-b font-medium w-10 text-center">
                    #
                  </th>
                  {/* NEW: Images */}
                  <th className="p-2 border-b font-medium w-[60px]">Images</th>
                  <th className="p-2 border-b font-medium">Product</th>
                  <th className="p-2 border-b font-medium">Buyer</th>
                  <th className="p-2 border-b font-medium">Seller</th>
                  <th className="p-2 border-b font-medium">Total</th>
                  <th className="p-2 border-b font-medium">Updated</th>
                  <th className="p-2 border-b font-medium">Buyer Slip</th>
                  <th className="p-2 border-b font-medium">Type / Method</th>
                  <th className="p-2 border-b font-medium">Order Status</th>
                  <th className="p-2 border-b font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const txnId = t._id?.toString?.() || t._id;
                  const awaiting = t.status === "AWAITING_ADMIN_REVIEW";
                  const editable =
                    editMode &&
                    (t.status === "ESCROW_FUNDED" ||
                      t.status === "REJECTED_BY_ADMIN");
                  const showActions = awaiting || editable;
                  const kindUp = String(t?.kind || t?.type || "").toUpperCase();
                  const isDonation = kindUp === "DONATION";

                  return (
                    <tr
                      key={txnId}
                      className={`align-top ${
                        deleteMode
                          ? "hover:bg-red-50 cursor-pointer"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (deleteMode) askDelete(txnId);
                      }}
                    >
                      <td className="p-2 text-center text-gray-600">
                        {idx + 1}
                      </td>

                      {/* NEW: Images cell */}
                      <td className="p-2">
                        <Thumb product={t.product} />
                      </td>

                      <td className="p-2">
                        <div className="font-medium">
                          {t.product?.title || "-"}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="leading-tight">
                          <div className="font-medium">{t.buyer?.name}</div>
                          <div className="text-sm text-gray-600">
                            {t.buyer?.email}
                          </div>
                          {t.buyer?.phone &&
                            (deleteMode ? (
                              <span className="flex items-center gap-1 text-sm text-[#325082]/40 mt-0.5">
                                <PhoneIcon className="w-3 h-3" />
                                {t.buyer.phone}
                              </span>
                            ) : (
                              <a
                                href={`tel:${t.buyer.phone}`}
                                className="flex items-center gap-1 text-sm text-[#325082] hover:underline mt-0.5"
                              >
                                <PhoneIcon className="w-3 h-3" />
                                {t.buyer.phone}
                              </a>
                            ))}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="leading-tight">
                          <div className="font-medium">{t.seller?.name}</div>
                          <div className="text-sm text-gray-600">
                            {t.seller?.email}
                          </div>
                          {t.seller?.phone &&
                            (deleteMode ? (
                              <span className="flex items-center gap-1 text-sm text-[#325082]/40 mt-0.5">
                                <PhoneIcon className="w-3 h-3" />
                                {t.seller.phone}
                              </span>
                            ) : (
                              <a
                                href={`tel:${t.seller.phone}`}
                                className="flex items-center gap-1 text-sm text-[#325082] hover:underline mt-0.5"
                              >
                                <PhoneIcon className="w-3 h-3" />
                                {t.seller.phone}
                              </a>
                            ))}
                        </div>
                      </td>

                      <td className="p-2">{fmtTotal(t)}</td>

                      <td className="p-2">
                        {new Date(t.updatedAt || t.createdAt).toLocaleString()}
                      </td>

                      <td className="p-2">
                        {t.buyerReceiptUrl ? (
                          deleteMode ? (
                            <span className="text-[#325082]/40">View Slip</span>
                          ) : (
                            <SlipLink
                              url={t.buyerReceiptUrl}
                              title="Buyer Payment Slip"
                            >
                              View Slip
                            </SlipLink>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="p-2">
                        <TypeAndMethod
                          kind={t.kind || t.type}
                          method={t.fulfillment?.method}
                        />
                      </td>

                      <td className="p-2">
                        <StatusPill status={t.status} />
                      </td>

                      <td className="p-2">
                        {deleteMode ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 p-1"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              askDelete(txnId);
                            }}
                          >
                            <TrashIcon className="w-5 h-5" />
                            <span className="text-sm font-semibold">
                              Delete
                            </span>
                          </button>
                        ) : !isDonation && t.status === "BUYER_CONFIRMED" ? (
                          // Hide payout button for DONATION
                          <ActionButton
                            text="Payout"
                            variant="primaryClick"
                            className="bg-emerald-700 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/admin/transactions/${txnId}/payout`
                              );
                            }}
                          />
                        ) : !isDonation && t.status === "PAID_OUT" ? (
                          <a
                            href={`/admin/transactions/${txnId}/payout`}
                            className="text-sm underline text-[#325082] underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Payout
                          </a>
                        ) : showActions ? (
                          <AdminTxnRowActions
                            txnId={txnId}
                            onDone={({ id, newStatus }) => {
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
                              if (editMode) setEditMode(false);
                            }}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    {/* updated colspan: 12 columns total */}
                    <td colSpan={12} className="p-4 text-center text-gray-500">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        variant="danger"
        message="Delete this transaction? This cannot be undone."
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={async () => {
          setConfirmOpen(false);
          if (pendingDeleteId) await deleteTxn(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </>
  );
}
