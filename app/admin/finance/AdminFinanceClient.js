"use client";

import { useEffect, useMemo, useState } from "react";
import StatusPill from "@/components/StatusPill";
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
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

export default function AdminFinanceClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // ✅ Finance tabs
  const [tab, setTab] = useState("PLATFORM"); // PLATFORM | SETTLEMENT

  // Repayment modal state
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayToAdminId, setRepayToAdminId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayReceiptUrl, setRepayReceiptUrl] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const hasStripeFeeMissing = useMemo(() => {
    return rows.some(
      (r) => Number(r.incoming || 0) > 0 && Number(r.stripeFee || 0) === 0,
    );
  }, [rows]);

  async function submitRepayment() {
    const amt = Number(repayAmount || 0);

    if (!repayToAdminId) {
      alert("Please choose an admin.");
      return;
    }
    if (!(amt > 0)) {
      alert("Amount must be greater than 0.");
      return;
    }
    if (!repayReceiptUrl) {
      alert("Receipt URL is required.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toAdminId: repayToAdminId,
          amount: amt,
          receiptUrl: repayReceiptUrl,
          note: repayNote,
        }),
      });
      if (!r.ok) throw new Error(await r.text());

      // reset + close + reload
      setRepayOpen(false);
      setRepayToAdminId("");
      setRepayAmount("");
      setRepayReceiptUrl("");
      setRepayNote("");
      await load();
    } catch (e) {
      alert(e?.message || "Failed to record repayment");
    } finally {
      setSubmitting(false);
    }
  }

  // ✅ Outstanding amount display (not only label)
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
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-2xl font-bold text-[#325082]">Finance</h1>
        <div className="block sm:hidden">
          <FinanceTabSwitch tab={tab} setTab={setTab} compact />
        </div>
        <div className="hidden sm:block">
          <FinanceTabSwitch tab={tab} setTab={setTab} />
        </div>
      </div>

      {/* ✅ SAME container as Transactions page */}
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

                            {/* ✅ SLIP per-transaction (best place) */}
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
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-lg font-bold text-[#1f2f4c]">
                      Admin Ledger
                    </div>
                    <div className="text-sm text-gray-600">
                      Tracks how much each admin advanced (payout/refund) and
                      how much has been reimbursed.
                    </div>
                  </div>

                  <ActionButton
                    text="Record Repayment"
                    variant="primaryClick"
                    onClick={() => setRepayOpen(true)}
                  />
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

                <div className="text-lg font-bold text-[#1f2f4c] mb-2">
                  Repayment History
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
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.map((s) => (
                        <tr key={s._id} className="hover:bg-gray-50">
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
                            {s.note || <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}

                      {settlements.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
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

      {/* ✅ FORM MODAL (no ConfirmModal) */}
      <Modal
        open={repayOpen}
        title="Record Repayment"
        onClose={() => (submitting ? null : setRepayOpen(false))}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Pay to Admin
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
              value={repayToAdminId}
              onChange={(e) => setRepayToAdminId(e.target.value)}
            >
              <option value="">— Select Admin —</option>
              {admins.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Amount (THB)
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="e.g. 950"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600 mb-1">
              Receipt URL (Slip)
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]"
              value={repayReceiptUrl}
              onChange={(e) => setRepayReceiptUrl(e.target.value)}
              placeholder="Cloudinary URL"
            />
          </div>

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
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <ActionButton
            text="Cancel"
            variant="outlineClick"
            onClick={() => setRepayOpen(false)}
            className="h-[32px] min-w-[90px] text-sm"
            disabled={submitting}
          />
          <ActionButton
            text={submitting ? "Saving..." : "Save"}
            variant="primaryClick"
            onClick={submitRepayment}
            className="h-[32px] min-w-[90px] text-sm"
            disabled={submitting}
          />
        </div>
      </Modal>
    </>
  );
}
