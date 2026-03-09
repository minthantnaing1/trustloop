// app/admin/AdminFinanceClient.js
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import StatusPill from "@/components/StatusPill";
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";
import ConfirmModal from "@/components/ConfirmModal";
import { TrashIcon } from "@heroicons/react/24/solid";

function thb(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}

/** Keep card style aligned with admin pages (white + shadow-md) */
function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-xl font-bold text-[#1f2f4c] mt-1">{value}</div>
    </div>
  );
}

/** Copy the same KindSwitch look/animation from TxnToolbar, but relabel tabs */
function FinanceTabSwitch({ tab, setTab, compact = false }) {
  const options = [
    { v: "PLATFORM", label: "Transactions" },
    { v: "SETTLEMENT", label: "Admin Settlement" },
  ];

  const activeIndex = options.findIndex((o) => o.v === tab);

  const wrapW = compact ? "w-[200px]" : "w-[290px]";
  const btnH = compact ? "h-8" : "h-10";
  const btnText = compact ? "text-xs" : "text-sm";
  const btnPad = compact ? "px-2" : "px-3";

  return (
    <div
      className={`relative inline-grid grid-cols-2 rounded-full bg-slate-100 p-1 shadow-sm ${wrapW}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#325082]
                    transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                    transform-gpu will-change-transform
                    ${activeIndex === 0 ? "translate-x-0" : "translate-x-full"}`}
      />

      {options.map((o) => {
        const active = tab === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => setTab(o.v)}
            className={`relative z-10 ${btnH} ${btnPad} ${btnText} font-medium rounded-full
                        transition-colors duration-[800ms]
                        ${
                          active
                            ? "text-white"
                            : "text-[#325082] hover:text-[#22365a]"
                        }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Simple modal (NOT ConfirmModal) for forms */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center px-3">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-[620px] bg-white rounded-xl shadow-md">
        <div className="px-5 py-4 border-b">
          <div className="text-lg font-bold text-[#1f2f4c]">{title}</div>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/** Replace alert() with small toast */
function Toast({ toast, onClose }) {
  if (!toast?.open) return null;

  const tone =
    toast.type === "success"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
      : toast.type === "warning"
        ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
        : "bg-red-50 text-red-800 ring-1 ring-red-200";

  return (
    <div className="fixed z-[30000] top-4 right-4 w-[92vw] max-w-[420px]">
      <div className={`rounded-xl shadow-md px-4 py-3 ${tone}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 text-sm font-medium">{toast.message}</div>
          <button
            type="button"
            className="text-xs font-semibold opacity-80 hover:opacity-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small helper under disabled buttons (no popups) */
function DisabledHint({ show, text }) {
  if (!show || !text) return null;
  return <div className="mt-2 text-xs text-amber-700">{text}</div>;
}

export default function AdminFinanceClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  const [tab, setTab] = useState("PLATFORM"); // PLATFORM | SETTLEMENT

  // Toast state (replaces alert)
  const [toast, setToast] = useState({
    open: false,
    type: "error",
    message: "",
  });
  const showToast = useCallback((type, message) => {
    setToast({ open: true, type, message: String(message || "") });
  }, []);
  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  // Repayment modal state
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayToAdminId, setRepayToAdminId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayReceiptUrl, setRepayReceiptUrl] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Receipt upload state
  const [repayReceiptFile, setRepayReceiptFile] = useState(null);
  const [repayUploading, setRepayUploading] = useState(false);

  // Delete mode
  const [settlementDeleteMode, setSettlementDeleteMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/finance", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setData(j);
    } catch (e) {
      setErr(e?.message || "Failed to load finance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = data?.summary || {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const admins = Array.isArray(data?.admins) ? data.admins : [];
  const adminLedger = Array.isArray(data?.adminLedger) ? data.adminLedger : [];
  const settlements = Array.isArray(data?.settlements) ? data.settlements : [];

  // ✅ permissions from API
  const isDeveloper = Boolean(data?.permissions?.isDeveloper);

  const hasStripeFeeMissing = useMemo(() => {
    return rows.some(
      (r) => Number(r.incoming || 0) > 0 && Number(r.stripeFee || 0) === 0,
    );
  }, [rows]);

  // ----- MINIMAL FIX: compute totals for repayment rules -----
  const myAdminId = String(data?.permissions?.adminId || "");
  const totalOwedAllAdmins = useMemo(() => {
    // sum of positive netOwed (including self)
    return adminLedger.reduce((sum, a) => {
      const v = Number(a?.netOwed || 0);
      return v > 0 ? sum + v : sum;
    }, 0);
  }, [adminLedger]);

  const isSelfRepay = useMemo(() => {
    return Boolean(myAdminId && repayToAdminId && myAdminId === repayToAdminId);
  }, [myAdminId, repayToAdminId]);

  // Extra UI: show how much the selected admin is owed (prevents confusion)
  const selectedNetOwed = useMemo(() => {
    if (!repayToAdminId) return 0;
    const row = adminLedger.find(
      (a) => String(a?.adminId) === String(repayToAdminId),
    );
    return Number(row?.netOwed || 0);
  }, [adminLedger, repayToAdminId]);

  // Disable reason for "Record Repayment" button (instead of alert)
  const recordRepayDisabledReason = useMemo(() => {
    if (!isDeveloper) return "Only the Stripe owner can record repayments.";
    if (!(Number(totalOwedAllAdmins) > 0))
      return "No outstanding amount owed to admins.";
    return "";
  }, [isDeveloper, totalOwedAllAdmins]);

  // Inline validation for modal (so user sees why Save is disabled)
  const repayFormError = useMemo(() => {
    if (!isDeveloper) return "Only the Stripe owner can record repayments.";
    if (!(Number(totalOwedAllAdmins) > 0))
      return "No outstanding amount owed to admins. Repayment is not allowed.";

    const amt = Number(repayAmount || 0);

    if (!repayToAdminId) return "Please choose an admin.";
    // optional but helpful: prevent paying admins who are not owed
    if (!(Number(selectedNetOwed) > 0))
      return "Selected admin is not owed any amount.";
    if (!(amt > 0)) return "Amount must be greater than 0.";

    // Rule 1: cannot repay more than total owed (including self)
    if (amt > Number(totalOwedAllAdmins || 0))
      return `Amount exceeds total owed to admins (max: ${thb(
        totalOwedAllAdmins,
      )}).`;

    // Helpful guard: cannot repay more than selected admin net owed
    if (amt > Number(selectedNetOwed || 0))
      return `Amount exceeds selected admin net owed (max: ${thb(
        selectedNetOwed,
      )}).`;

    // Rule 3: slip required only if NOT paying self
    if (!isSelfRepay && !String(repayReceiptUrl || "").trim())
      return "Receipt slip is required (upload or paste URL).";

    return "";
  }, [
    isDeveloper,
    totalOwedAllAdmins,
    repayAmount,
    repayToAdminId,
    selectedNetOwed,
    isSelfRepay,
    repayReceiptUrl,
  ]);
  // ----- END MINIMAL FIX -----

  async function uploadRepayReceipt(file) {
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      showToast("warning", "Please upload an image file.");
      return;
    }
    const maxMB = 8;
    if (file.size > maxMB * 1024 * 1024) {
      showToast("warning", `File too large. Max ${maxMB}MB.`);
      return;
    }

    setRepayUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || (await res.text()));
      if (!j?.url) throw new Error("Upload failed: no URL returned.");

      setRepayReceiptUrl(j.url);
      showToast("success", "Slip uploaded.");
    } catch (e) {
      showToast("error", e?.message || "Failed to upload slip.");
    } finally {
      setRepayUploading(false);
    }
  }

  async function submitRepayment() {
    // Replace all alerts with UI validation + toast
    if (repayFormError) {
      showToast("warning", repayFormError);
      return;
    }

    const amt = Number(repayAmount || 0);

    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAdminId: repayToAdminId,
          amount: amt,
          receiptUrl: isSelfRepay ? "" : repayReceiptUrl, // allow blank when self
          note: repayNote,
        }),
      });
      if (!r.ok) throw new Error(await r.text());

      setRepayOpen(false);
      setRepayToAdminId("");
      setRepayAmount("");
      setRepayReceiptUrl("");
      setRepayNote("");
      setRepayReceiptFile(null);

      showToast("success", "Repayment recorded.");
      await load();
    } catch (e) {
      showToast("error", e?.message || "Failed to record repayment");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSettlement(id) {
    // ✅ extra client guard (toast instead of alert)
    if (!isDeveloper) {
      showToast("warning", "Only the Stripe owner can delete repayments.");
      return;
    }

    try {
      const r = await fetch(`/api/admin/finance/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      showToast("success", "Repayment deleted.");
      await load();
    } catch (e) {
      showToast("error", e?.message || "Failed to delete repayment");
    }
  }

  function askDelete(id) {
    if (!isDeveloper) {
      showToast("warning", "Only the Stripe owner can delete repayments.");
      return;
    }
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  function getOutstandingAmount(r) {
    const payoutAmt = Number(r.outstandingPayoutAmount ?? r.sellerNet ?? 0);
    const refundAmt = Number(
      r.outstandingRefundAmount ?? r.buyerRefundNet ?? 0,
    );

    if (r.isOutstandingPayout) return payoutAmt;
    if (r.isOutstandingRefund) return refundAmt;

    const st = String(r.status || "").toUpperCase();
    if (st === "BUYER_CONFIRMED") return payoutAmt;
    if (st === "CANCELLED_BY_BUYER" || st === "CANCELLED_BY_SELLER")
      return refundAmt;

    return 0;
  }

  function splitDateTime(d) {
    if (!d) return { date: "-", time: "" };
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return { date: "-", time: "" };

    return {
      date: x.toLocaleDateString(),
      time: x.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  }

  return (
    <>
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#325082]">Finance</h1>
        <div className="block sm:hidden">
          <FinanceTabSwitch tab={tab} setTab={setTab} compact />
        </div>
        <div className="hidden sm:block">
          <FinanceTabSwitch tab={tab} setTab={setTab} />
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md">
        {err && <p className="text-red-600 mb-2">Error: {String(err)}</p>}
        {loading && <p className="text-gray-500">Loading finance…</p>}

        {!loading && !err && (
          <>
            {tab === "PLATFORM" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  <StatCard
                    title="Outstanding Refund Buyers"
                    value={thb(summary.outstandingRefundTotal)}
                  />
                  <StatCard
                    title="Outstanding Pay Sellers"
                    value={thb(summary.outstandingPayoutTotal)}
                  />
                  <StatCard
                    title="Profit (5% - Stripe)"
                    value={thb(summary.profitTotal)}
                  />
                </div>

                {hasStripeFeeMissing && (
                  <div className="mb-4 bg-amber-50 ring-1 ring-amber-200 text-amber-800 rounded-xl p-3 text-sm">
                    Some Stripe fees are ฿0 (fee not stored yet for some
                    orders). Admin payout/refund tracking still works.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 border-b font-medium">Date</th>
                        <th className="p-2 border-b font-medium">Order</th>
                        <th className="p-2 border-b font-medium">Buyer</th>
                        <th className="p-2 border-b font-medium">Seller</th>
                        <th className="p-2 border-b font-medium">Incoming</th>
                        <th className="p-2 border-b font-medium">Stripe Fee</th>
                        <th className="p-2 border-b font-medium">
                          Left After Stripe
                        </th>
                        <th className="p-2 border-b font-medium">
                          Platform 5%
                        </th>
                        <th className="p-2 border-b font-medium">Profit</th>
                        <th className="p-2 border-b font-medium">
                          Outstanding
                        </th>
                        <th className="p-2 border-b font-medium">Slip</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((r) => {
                        const { date, time } = splitDateTime(r.createdAt);

                        const flags = [];
                        if (r.isOutstandingPayout) flags.push("Pay seller");
                        if (r.isOutstandingRefund) flags.push("Refund buyer");

                        const outstandingAmt = getOutstandingAmount(r);

                        return (
                          <tr
                            key={r._id}
                            className="hover:bg-gray-50 align-top"
                          >
                            <td className="p-2 border-b whitespace-nowrap">
                              <div>{date}</div>
                              {time ? (
                                <div className="text-xs text-gray-500">
                                  {time}
                                </div>
                              ) : null}
                            </td>

                            <td className="p-2 border-b">
                              <div className="font-medium">
                                {r.productTitle || "—"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {r._id}
                              </div>
                              <div className="mt-2">
                                <StatusPill status={r.status} />
                              </div>
                            </td>

                            <td className="p-2 border-b">
                              <div className="leading-tight">
                                <div className="font-medium">
                                  {r.buyer?.name || "—"}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {r.buyer?.email || ""}
                                </div>
                              </div>
                            </td>

                            <td className="p-2 border-b">
                              <div className="leading-tight">
                                <div className="font-medium">
                                  {r.seller?.name || "—"}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {r.seller?.email || ""}
                                </div>
                              </div>
                            </td>

                            <td className="p-2 border-b font-semibold text-[#1f2f4c]">
                              {thb(r.incoming)}
                            </td>
                            <td className="p-2 border-b">{thb(r.stripeFee)}</td>
                            <td className="p-2 border-b">
                              {thb(r.leftAfterStripe)}
                            </td>
                            <td className="p-2 border-b">
                              {thb(r.platformFee)}
                            </td>

                            <td
                              className={`p-2 border-b font-semibold ${
                                Number(r.profit) < 0
                                  ? "text-red-600"
                                  : "text-emerald-700"
                              }`}
                            >
                              {thb(r.profit)}
                            </td>

                            <td className="p-2 border-b">
                              {flags.length && outstandingAmt > 0 ? (
                                <div className="leading-tight">
                                  <div className="font-semibold text-amber-700">
                                    {thb(outstandingAmt)}
                                  </div>
                                  <div className="text-xs text-amber-700">
                                    {flags.join(" • ")}
                                  </div>
                                </div>
                              ) : flags.length ? (
                                <span className="text-xs font-semibold text-amber-700">
                                  {flags.join(" • ")}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>

                            <td className="p-2 border-b">
                              {r.adminPayoutReceiptUrl ||
                              r.adminRefundReceiptUrl ? (
                                <div className="flex flex-col gap-1 text-xs">
                                  {r.adminPayoutReceiptUrl ? (
                                    <SlipLink
                                      url={r.adminPayoutReceiptUrl}
                                      label="Payout Slip"
                                    />
                                  ) : null}
                                  {r.adminRefundReceiptUrl ? (
                                    <SlipLink
                                      url={r.adminRefundReceiptUrl}
                                      label="Refund Slip"
                                    />
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={11}
                            className="p-4 text-center text-gray-500"
                          >
                            No finance rows found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === "SETTLEMENT" && (
              <>
                <div className="flex items-start gap-3 mb-3">
                  <div>
                    <div className="text-lg font-bold text-[#1f2f4c]">
                      Admin Ledger
                    </div>
                    <div className="text-sm text-gray-600">
                      Tracks how much each admin advanced (payout/refund) and
                      how much has been reimbursed.
                    </div>

                    {!isDeveloper && (
                      <div className="mt-2 text-xs text-amber-700">
                        Only the Stripe owner can record or delete repayments.
                      </div>
                    )}
                  </div>

                  {isDeveloper && (
                    <div className="ml-auto flex flex-col items-end">
                      <ActionButton
                        text="Record Repayment"
                        variant="primaryClick"
                        onClick={() => {
                          if (recordRepayDisabledReason) {
                            showToast("warning", recordRepayDisabledReason);
                            return;
                          }
                          setRepayOpen(true);
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 border-b font-medium">Admin</th>
                        <th className="p-2 border-b font-medium">
                          Paid Sellers
                        </th>
                        <th className="p-2 border-b font-medium">
                          Refunded Buyers
                        </th>
                        <th className="p-2 border-b font-medium">
                          Advanced Total
                        </th>
                        <th className="p-2 border-b font-medium">Reimbursed</th>
                        <th className="p-2 border-b font-medium">Net Owed</th>
                      </tr>
                    </thead>

                    <tbody>
                      {adminLedger.map((a) => (
                        <tr key={a.adminId} className="hover:bg-gray-50">
                          <td className="p-2 border-b">
                            <div className="font-medium">{a.name}</div>
                            <div className="text-sm text-gray-600">
                              {a.email}
                            </div>
                          </td>
                          <td className="p-2 border-b">
                            {thb(a.payoutAdvance)}
                          </td>
                          <td className="p-2 border-b">
                            {thb(a.refundAdvance)}
                          </td>
                          <td className="p-2 border-b font-semibold">
                            {thb(a.advancedTotal)}
                          </td>
                          <td className="p-2 border-b">
                            {thb(a.reimbursedTotal)}
                          </td>
                          <td
                            className={`p-2 border-b font-bold ${
                              Number(a.netOwed) > 0
                                ? "text-amber-700"
                                : "text-gray-500"
                            }`}
                          >
                            {thb(a.netOwed)}
                          </td>
                        </tr>
                      ))}

                      {adminLedger.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-4 text-center text-gray-500"
                          >
                            No admin advances / settlements recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg font-bold text-[#1f2f4c]">
                    Repayment History
                  </div>

                  {isDeveloper ? (
                    <ActionButton
                      text="Delete"
                      variant={
                        settlementDeleteMode
                          ? "dangerPrimaryClick"
                          : "dangerOutlineHover"
                      }
                      onClick={() => {
                        if (settlements.length === 0) {
                          showToast("warning", "No repayments to delete.");
                          return;
                        }
                        setSettlementDeleteMode((v) => !v);
                      }}
                      className="h-[32px] min-w-[70px] text-sm"
                      disabled={settlements.length === 0}
                    />
                  ) : null}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 border-b font-medium">Date</th>
                        <th className="p-2 border-b font-medium">From</th>
                        <th className="p-2 border-b font-medium">To</th>
                        <th className="p-2 border-b font-medium">Amount</th>
                        <th className="p-2 border-b font-medium">Slip</th>
                        <th className="p-2 border-b font-medium">Note</th>
                        <th className="p-2 border-b font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => {
                        const sid = s._id?.toString?.() || s._id;

                        return (
                          <tr
                            key={sid}
                            className={`align-top ${
                              settlementDeleteMode && isDeveloper
                                ? "hover:bg-red-50 cursor-pointer"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              if (settlementDeleteMode && isDeveloper)
                                askDelete(sid);
                            }}
                          >
                            <td className="p-2 border-b whitespace-nowrap">
                              {s.createdAt
                                ? new Date(s.createdAt).toLocaleString()
                                : "-"}
                            </td>

                            <td className="p-2 border-b">
                              <div className="font-medium">
                                {s.fromAdmin?.name || "—"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {s.fromAdmin?.email || ""}
                              </div>
                            </td>

                            <td className="p-2 border-b">
                              <div className="font-medium">
                                {s.toAdmin?.name || "—"}
                              </div>
                              <div className="text-sm text-gray-600">
                                {s.toAdmin?.email || ""}
                              </div>
                            </td>

                            <td className="p-2 border-b font-semibold">
                              {thb(s.amount)}
                            </td>

                            <td className="p-2 border-b">
                              {s.receiptUrl ? (
                                <SlipLink url={s.receiptUrl} label="Slip" />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>

                            <td className="p-2 border-b">
                              {s.note || (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>

                            <td className="p-2 border-b">
                              {settlementDeleteMode && isDeveloper ? (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 p-1"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    askDelete(sid);
                                  }}
                                >
                                  <TrashIcon className="w-5 h-5" />
                                  <span className="text-sm font-semibold">
                                    Delete
                                  </span>
                                </button>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {settlements.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-4 text-center text-gray-500"
                          >
                            No repayments recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* repayment modal */}
      <Modal
        open={repayOpen}
        title="Record Repayment"
        onClose={() =>
          submitting || repayUploading ? null : setRepayOpen(false)
        }
      >
        {!isDeveloper ? (
          <div className="text-sm text-red-600">
            You are not the Stripe owner.
          </div>
        ) : (
          <>
            {/* Nice inline box showing why Save is disabled (instead of alert) */}
            <div className="mb-3">
              <div className="text-xs text-gray-600">
                Total owed to admins:{" "}
                <span className="font-semibold text-[#1f2f4c]">
                  {thb(totalOwedAllAdmins)}
                </span>
              </div>

              {repayFormError ? (
                <div className="mt-2 bg-amber-50 ring-1 ring-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm">
                  {repayFormError}
                </div>
              ) : (
                <div className="mt-2 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
                  Ready to save.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Pay to Admin
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
                  value={repayToAdminId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRepayToAdminId(v);

                    // Rule 3: if switching to self, clear slip
                    if (myAdminId && v === myAdminId) {
                      setRepayReceiptFile(null);
                      setRepayReceiptUrl("");
                    }
                  }}
                  disabled={submitting || repayUploading}
                >
                  <option value="">— Select Admin —</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>

                {/* Small helpful info */}
                {repayToAdminId ? (
                  <div className="mt-1 text-xs text-gray-500">
                    Selected admin net owed:{" "}
                    <span className="font-semibold">
                      {thb(selectedNetOwed)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Amount (THB)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
               focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
                  value={repayAmount}
                  onChange={(e) => {
                    // allow only digits
                    const v = e.target.value.replace(/\D/g, "");
                    setRepayAmount(v);
                  }}
                  onKeyDown={(e) => {
                    // block non-number keys commonly allowed by number input
                    if (["e", "E", "+", "-", "."].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={`e.g. 950 (max ${thb(totalOwedAllAdmins)})`}
                  disabled={submitting || repayUploading}
                />
              </div>

              {/* Rule 3: hide slip UI when paying self */}
              {!isSelfRepay ? (
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-1">
                    Receipt Slip (upload)
                  </label>

                  <div className="rounded-xl border border-dashed border-[#325082]/50 bg-[#f6f8fc] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-[#1f2f4c]">
                        {repayReceiptFile ? (
                          <>
                            <div className="font-medium">
                              {repayReceiptFile.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {(repayReceiptFile.size / 1024 / 1024).toFixed(2)}{" "}
                              MB
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-700">
                            Upload slip image (JPG/PNG)
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex">
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            disabled={submitting || repayUploading}
                            onChange={async (e) => {
                              const file = e.target.files?.[0] || null;
                              if (!file) return;

                              setRepayReceiptFile(file);
                              setRepayReceiptUrl("");
                              await uploadRepayReceipt(file);

                              e.target.value = "";
                            }}
                          />
                          <span
                            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-sm border
                            ${
                              submitting || repayUploading
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-white text-[#325082] border-[#cfdaf1] hover:bg-[#eef3fd]"
                            }`}
                          >
                            Choose File
                          </span>
                        </label>

                        {repayReceiptFile && (
                          <button
                            type="button"
                            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-sm border
                            ${
                              submitting || repayUploading
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                            }`}
                            disabled={submitting || repayUploading}
                            onClick={() => {
                              setRepayReceiptFile(null);
                              setRepayReceiptUrl("");
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <div className="w-[120px] h-[90px] rounded-lg overflow-hidden bg-white border border-[#e7ecf8] flex items-center justify-center">
                        {repayReceiptUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={repayReceiptUrl}
                            alt="Slip preview"
                            className="w-full h-full object-cover"
                          />
                        ) : repayReceiptFile ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(repayReceiptFile)}
                            alt="Slip preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No slip</span>
                        )}
                      </div>

                      <div className="flex-1">
                        {repayUploading ? (
                          <div className="text-sm text-[#325082] font-medium">
                            Uploading slip…
                          </div>
                        ) : repayReceiptUrl ? (
                          <div className="text-sm text-emerald-700 font-medium">
                            Uploaded ✅
                          </div>
                        ) : repayReceiptFile ? (
                          <div className="text-sm text-amber-700 font-medium">
                            Not uploaded yet (try another file)
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">
                            Upload is recommended.
                          </div>
                        )}

                        <div className="mt-2">
                          <label className="block text-xs text-gray-600 mb-1">
                            Receipt URL (optional manual paste)
                          </label>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                                     focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
                            value={repayReceiptUrl}
                            onChange={(e) => setRepayReceiptUrl(e.target.value)}
                            placeholder="Cloudinary URL"
                            disabled={submitting || repayUploading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 text-sm text-gray-600">
                  Paying yourself does not require a slip.
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">
                  Note (optional)
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  placeholder="e.g. Paid after Stripe payout"
                  disabled={submitting || repayUploading}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <ActionButton
                text="Cancel"
                variant="outlineClick"
                onClick={() => setRepayOpen(false)}
                className="h-[32px] min-w-[90px] text-sm"
                disabled={submitting || repayUploading}
              />
              <ActionButton
                text={submitting ? "Saving..." : "Save"}
                variant="primaryClick"
                onClick={submitRepayment}
                className="h-[32px] min-w-[90px] text-sm"
                disabled={
                  submitting || repayUploading || Boolean(repayFormError)
                }
              />
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        variant="danger"
        message="Delete this repayment record? This will also delete the slip image from Cloudinary. This cannot be undone."
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={async () => {
          setConfirmOpen(false);
          if (pendingDeleteId) await deleteSettlement(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </>
  );
}
