// app/my-orders/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import NavBar from "@/components/NavBar";
import StatusPill from "@/components/StatusPill";

import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// small display item
function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-5 h-5 mt-0.5 text-[#325082]/70" />}
      <div>
        <div className="text-xs uppercase tracking-wide text-[#325082]/70 font-semibold">
          {label}
        </div>
        <div className="text-[15px] text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function fmt(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [txn, setTxn] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // local inputs (delivery)
  const [scheduledAt, setScheduledAt] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");

  // local inputs (meetup)
  const [meetLoc, setMeetLoc] = useState("");
  const [meetTime, setMeetTime] = useState("");

  async function load() {
    const [txnRes, meRes] = await Promise.all([
      fetch(`/api/transactions/${id}`, { cache: "no-store" }),
      fetch(`/api/users/me`, { cache: "no-store" }).catch(() => null),
    ]);
    if (!txnRes.ok) throw new Error(await txnRes.text());
    const data = await txnRes.json();
    setTxn(data);

    // seed local inputs from fulfillment
    const f = data.fulfillment || {};
    setCarrier(f.carrier || "");
    setTracking(f.tracking || "");
    setNotes(f.notes || "");
    setMeetLoc(f.meetupLocation || "");
    setScheduledAt(
      f.scheduledAt ? new Date(f.scheduledAt).toISOString().slice(0, 16) : ""
    );
    setMeetTime(
      f.meetupProposedAt
        ? new Date(f.meetupProposedAt).toISOString().slice(0, 16)
        : ""
    );

    if (meRes && meRes.ok) {
      const meData = await meRes.json();
      setMe(meData);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load order");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isBuyer = me && txn && String(txn.buyer?._id) === String(me._id);
  const isSeller = me && txn && String(txn.seller?._id) === String(me._id);
  const method = txn?.fulfillment?.method || "—";

  async function doPatch(payload) {
    try {
      setBusy(true);
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      // refresh local txn state
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  // styling helpers
  const card =
    "rounded-2xl bg-white/95 shadow-md ring-1 ring-[#e6eeff] backdrop-blur";
  const sectionTitle =
    "text-[15px] font-semibold text-[#1f3b66] bg-[#eef4ff] rounded-lg px-3 py-2 inline-flex items-center gap-2";

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-4 mb-10">
        {/* Title + Back */}
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/my-orders"
            className="inline-flex items-center text-[#325082] hover:underline text-sm font-medium"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-[#1f3b66]">Order Details</h1>
        </div>

        {/* Stepper */}
        <div className="mb-5">
          <ol className="flex items-center text-sm">
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                1
              </span>
              Review
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                2
              </span>
              Pay & Upload
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center font-semibold text-[#325082]">
              <span className="w-6 h-6 rounded-full bg-[#325082] text-white flex items-center justify-center text-xs mr-2">
                3
              </span>
              Deliver
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                4
              </span>
              Payout
            </li>
          </ol>
        </div>

        {err && <p className="text-red-600 mb-3">{err}</p>}
        {!txn && !err && <p className="text-gray-500">Loading…</p>}

        {txn && (
          <div className="space-y-6">
            {/* Transaction header */}
            <div className={`${card} p-6`}>
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="min-w-0">
                  <div className="text-sm text-[#6881b5]">Transaction</div>
                  <h2 className="text-xl font-semibold text-[#1f2d4d] truncate">
                    {txn.product?.title || "-"}
                  </h2>
                </div>

                {/* Status + Total */}
                <div className="flex items-center gap-3">
                  <StatusPill status={txn.status} />
                  <div className="text-sm sm:text-base text-[#1f3b66]">
                    <span className="font-semibold">Total</span>{" "}
                    <span className="font-bold">
                      ฿{Number(txn.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Buyer */}
                <div className="rounded-xl bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff]">
                  <div className={sectionTitle}>
                    <UserCircleIcon className="w-5 h-5" />
                    Buyer
                  </div>
                  <div className="mt-3 space-y-0.5">
                    <div className="font-medium text-gray-900">
                      {txn.buyer?.name || txn.buyer?.email || "-"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {txn.buyer?.email}
                    </div>
                  </div>
                </div>

                {/* Seller */}
                <div className="rounded-xl bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff]">
                  <div className={sectionTitle}>
                    <UserCircleIcon className="w-5 h-5" />
                    Seller
                  </div>
                  <div className="mt-3 space-y-0.5">
                    <div className="font-medium text-gray-900">
                      {txn.seller?.name || txn.seller?.email || "-"}
                    </div>
                    <div className="text-sm text-gray-600">
                      {txn.seller?.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#e7ecf8]">
                <div className="text-sm text-gray-600">
                  Updated{" "}
                  {new Date(txn.updatedAt || txn.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-4">
                  {txn.buyerReceiptUrl && (
                    <a
                      href={txn.buyerReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline text-[#325082] underline-offset-2"
                    >
                      Receipt
                    </a>
                  )}
                  <Link
                    href={`/buy-sell/${txn.product?._id || ""}`}
                    className="text-sm underline text-[#325082] underline-offset-2"
                  >
                    Product
                  </Link>
                </div>
              </div>
            </div>

            {/* Fulfillment (Delivery/Meetup) */}
            <div className={`${card} p-6`}>
              <div className={sectionTitle}>
                <TruckIcon className="w-5 h-5" />
                {method === "DELIVERY"
                  ? "Delivery"
                  : method === "MEETUP"
                  ? "Meetup"
                  : "Fulfillment"}
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                <Field label="Method" value={method} icon={TruckIcon} />
                <Field
                  label={method === "DELIVERY" ? "Ship/ETA" : "Meetup Time"}
                  value={
                    method === "DELIVERY"
                      ? fmt(txn.fulfillment?.scheduledAt)
                      : fmt(
                          txn.fulfillment?.meetupScheduledAt ||
                            txn.fulfillment?.meetupProposedAt
                        )
                  }
                  icon={ClockIcon}
                />
                <Field
                  label={method === "DELIVERY" ? "Address" : "Meetup Location"}
                  value={
                    method === "DELIVERY"
                      ? txn.fulfillment?.address || "—"
                      : txn.fulfillment?.meetupLocation || "—"
                  }
                  icon={MapPinIcon}
                />
                {method === "DELIVERY" && (
                  <>
                    <Field
                      label="Carrier"
                      value={txn.fulfillment?.carrier || "—"}
                      icon={TruckIcon}
                    />
                    <Field
                      label="Tracking"
                      value={txn.fulfillment?.tracking || "—"}
                      icon={ClipboardDocumentListIcon}
                    />
                  </>
                )}
                <Field
                  label="Notes"
                  value={txn.fulfillment?.notes || "—"}
                  icon={ClipboardDocumentListIcon}
                />
              </div>

              {/* Role-aware controls */}
              <div className="mt-6 border-t pt-4 border-[#e7ecf8]">
                {/* DELIVERY: seller sets details / starts / marks delivered */}
                {method === "DELIVERY" &&
                  isSeller &&
                  [
                    "ESCROW_FUNDED",
                    "SELLER_ACCEPTED",
                    "DELIVERY_IN_PROGRESS",
                  ].includes(txn.status) && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#325082] mb-1">
                            Ship/ETA (within 7 days)
                          </label>
                          <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            disabled={
                              busy || txn.status === "DELIVERY_IN_PROGRESS"
                            }
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#325082] mb-1">
                            Carrier
                          </label>
                          <input
                            type="text"
                            value={carrier}
                            onChange={(e) => setCarrier(e.target.value)}
                            disabled={
                              busy || txn.status === "DELIVERY_IN_PROGRESS"
                            }
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                            placeholder="Thailand Post, Kerry, etc."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#325082] mb-1">
                            Tracking
                          </label>
                          <input
                            type="text"
                            value={tracking}
                            onChange={(e) => setTracking(e.target.value)}
                            disabled={
                              busy || txn.status === "DELIVERY_IN_PROGRESS"
                            }
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#325082] mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={
                              busy || txn.status === "DELIVERY_IN_PROGRESS"
                            }
                            className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                            placeholder="Leave at reception…"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {/* Save & Start are only useful before in-progress */}
                        {["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(
                          txn.status
                        ) && (
                          <>
                            <button
                              disabled={busy}
                              onClick={() =>
                                doPatch({
                                  action: "seller_set_delivery",
                                  scheduledAt,
                                  carrier,
                                  tracking,
                                  notes,
                                })
                              }
                              className="px-4 py-2 rounded-lg bg-[#eef4ff] text-[#1f3b66] ring-1 ring-[#dbe6ff] hover:bg-[#e6f0ff]"
                            >
                              Save Delivery Details
                            </button>

                            <button
                              disabled={busy}
                              onClick={() =>
                                doPatch({ action: "mark_delivery_in_progress" })
                              }
                              className="px-4 py-2 rounded-lg bg-[#325082] text-white hover:bg-[#2b446e]"
                            >
                              Start Delivery
                            </button>
                          </>
                        )}

                        {/* Mark Delivered visible during in-progress */}
                        {txn.status === "DELIVERY_IN_PROGRESS" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              doPatch({ action: "seller_mark_delivered" })
                            }
                            className="px-4 py-2 rounded-lg bg-[#6b5bd2]/10 text-[#3b2f8f] ring-1 ring-[#cfc8ff] hover:bg-[#6b5bd2]/20"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {/* MEETUP: propose/accept, and during in-progress allow seller to mark completed */}
                {method === "MEETUP" &&
                  [
                    "ESCROW_FUNDED",
                    "SELLER_ACCEPTED",
                    "DELIVERY_IN_PROGRESS",
                  ].includes(txn.status) && (
                    <div className="space-y-3">
                      {/* Inputs are only editable before in-progress */}
                      {["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(
                        txn.status
                      ) && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#325082] mb-1">
                                Meetup Location
                              </label>
                              <input
                                type="text"
                                value={meetLoc}
                                onChange={(e) => setMeetLoc(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                                placeholder="ABAC Hua Mak Gate 2"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#325082] mb-1">
                                Proposed Time
                              </label>
                              <input
                                type="datetime-local"
                                value={meetTime}
                                onChange={(e) => setMeetTime(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              disabled={busy || !meetLoc || !meetTime}
                              onClick={() =>
                                doPatch({
                                  action: "propose_meetup",
                                  meetupLocation: meetLoc,
                                  meetupProposedAt: meetTime,
                                })
                              }
                              className="px-4 py-2 rounded-lg bg-[#eef4ff] text-[#1f3b66] ring-1 ring-[#dbe6ff] hover:bg-[#e6f0ff]"
                            >
                              Propose Meetup
                            </button>

                            {txn.fulfillment?.meetupProposedAt &&
                              txn.fulfillment?.meetupLocation &&
                              me &&
                              String(txn.fulfillment?.meetupProposedBy) !==
                                String(me._id) && (
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    doPatch({ action: "accept_meetup" })
                                  }
                                  className="px-4 py-2 rounded-lg bg-[#325082] text-white hover:bg-[#2b446e]"
                                >
                                  Accept Proposal
                                </button>
                              )}
                          </div>
                        </>
                      )}

                      {/* During in-progress, seller can mark completed */}
                      {isSeller && txn.status === "DELIVERY_IN_PROGRESS" && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            disabled={busy}
                            onClick={() =>
                              doPatch({ action: "mark_meetup_completed" })
                            }
                            className="px-4 py-2 rounded-lg bg-[#6fd3e6]/10 text-[#086b7f] ring-1 ring-[#bfeef6] hover:bg-[#6fd3e6]/20"
                          >
                            Mark Meetup Completed
                          </button>
                        </div>
                      )}

                      {txn.fulfillment?.meetupProposedAt && (
                        <div className="text-sm text-gray-700">
                          Current proposal:{" "}
                          <b>{txn.fulfillment.meetupLocation}</b> at{" "}
                          <b>{fmt(txn.fulfillment.meetupProposedAt)}</b>
                        </div>
                      )}
                    </div>
                  )}

                {/* Buyer confirm received for both flows */}
                {isBuyer &&
                  (txn.status === "SELLER_DELIVERED" ||
                    txn.status === "MEETUP_COMPLETED") && (
                    <div className="mt-4">
                      <button
                        disabled={busy}
                        onClick={() => doPatch({ action: "buyer_confirm" })}
                        className="px-4 py-2 rounded-lg bg-[#10b981]/90 text-white hover:bg-[#0ea371]"
                      >
                        Confirm Received
                      </button>
                    </div>
                  )}
              </div>
            </div>

            {/* Timeline */}
            <div className={`${card} p-6`}>
              <div className={sectionTitle}>
                <ClipboardDocumentListIcon className="w-5 h-5" />
                Timeline
              </div>

              {Array.isArray(txn.timeline) && txn.timeline.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {[...txn.timeline].reverse().map((e, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-[#f8fbff] ring-1 ring-[#e6eeff] px-3 py-2"
                    >
                      <div className="text-sm text-gray-800">
                        {e.action || "-"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {e.at ? new Date(e.at).toLocaleString() : "-"}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 text-sm text-gray-500">No events yet.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
