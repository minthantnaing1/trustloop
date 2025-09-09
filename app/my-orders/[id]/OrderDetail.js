// app/my-orders/[id]/OrderDetail.js
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { fmtBKK, toLocalInputValue } from "@/utils/timeAgo";
import Stepper from "@/components/Stepper";

// tiny presentational element
function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-5 h-5 mt-0.5 text-[#325082]/70" />}
      <div>
        <div className="text-xs uppercase tracking-wide text-[#325082]/70 font-semibold">
          {label}
        </div>
        <div className="text-[15px] text-gray-800">{value ?? "—"}</div>
      </div>
    </div>
  );
}

// ---- Config
const MEETUP_MAX_DAYS = 10;
const DELIVERY_MAX_DAYS = 10;

// Helpers for datetime-local min/max (local time)
function addDaysLocalInput(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setSeconds(0, 0);
  return toLocalInputValue(d);
}
function nowLocalInput() {
  const d = new Date();
  d.setSeconds(0, 0);
  return toLocalInputValue(d);
}
function formatRemaining(ms) {
  if (ms == null) return "";
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  // Show seconds always, with zero-padded units after the largest non-zero
  if (d > 0)
    return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  if (h > 0)
    return `${h}h ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const deliveryMinLocalInput = () => nowLocalInput();
const deliveryMaxLocalInput = () => addDaysLocalInput(DELIVERY_MAX_DAYS);

export default function OrderDetail({ id }) {
  const [txn, setTxn] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [remainMs, setRemainMs] = useState(null);
  const router = useRouter();

  // delivery inputs
  const [scheduledAt, setScheduledAt] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");

  // meetup inputs
  const [meetLoc, setMeetLoc] = useState("");
  const [meetTime, setMeetTime] = useState("");

  // min/max windows
  const meetMin = useMemo(() => nowLocalInput(), []);
  const meetMax = useMemo(() => addDaysLocalInput(MEETUP_MAX_DAYS), []);
  const deliveryMin = useMemo(() => deliveryMinLocalInput(), []);
  const deliveryMax = useMemo(() => deliveryMaxLocalInput(), []);

  async function load() {
    const [txnRes, meRes] = await Promise.all([
      fetch(`/api/transactions/${id}`, { cache: "no-store" }),
      fetch(`/api/users/me`, { cache: "no-store" }).catch(() => null),
    ]);
    if (!txnRes.ok) throw new Error(await txnRes.text());
    const data = await txnRes.json();
    setTxn(data);

    const f = data.fulfillment || {};
    setCarrier(f.carrier || "");
    setTracking(f.tracking || "");
    setNotes(f.notes || "");
    setMeetLoc(f.meetupLocation || "");
    setScheduledAt(toLocalInputValue(f.scheduledAt));
    setMeetTime(toLocalInputValue(f.meetupProposedAt));

    if (meRes?.ok) setMe(await meRes.json());
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message || "Failed to load order"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!txn) return;

    const needsConfirm =
      ["SELLER_DELIVERED", "MEETUP_COMPLETED"].includes(txn.status) &&
      txn.autoConfirmAt;

    if (!needsConfirm) {
      setRemainMs(null);
      return;
    }

    const target = new Date(txn.autoConfirmAt).getTime();
    const tick = () => setRemainMs(Math.max(0, target - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [txn?.status, txn?.autoConfirmAt]);

  const isBuyer = me && txn && String(txn.buyer?._id) === String(me._id);
  const isSeller = me && txn && String(txn.seller?._id) === String(me._id);
  const method = txn?.fulfillment?.method || "—";

  // Show only the other party
  const otherParty = isSeller ? txn?.buyer : txn?.seller;
  const otherRoleLabel = isSeller ? "Buyer" : "Seller";
  const otherPhone = otherParty?.phone || "";

  async function doPatch(payload) {
    try {
      setBusy(true);
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      // refresh local state
      await load();

      // if seller just marked delivered/meetup completed, go to payout
      if (
        isSeller &&
        (payload?.action === "seller_mark_delivered" ||
          payload?.action === "mark_meetup_completed")
      ) {
        router.push(`/my-orders/${id}/payout`);
      }
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  // Validation helpers
  function validateMeetupWindow(dtStr) {
    if (!dtStr) return false;
    const chosen = new Date(dtStr).getTime();
    const min = new Date(meetMin).getTime();
    const max = new Date(meetMax).getTime();
    return chosen >= min && chosen <= max;
  }
  function validateDeliveryWindow(dtStr) {
    if (!dtStr) return true; // allow empty until set
    const chosen = new Date(dtStr).getTime();
    const min = new Date(deliveryMin).getTime();
    const max = new Date(deliveryMax).getTime();
    return chosen >= min && chosen <= max;
  }

  // Count seller delivery edits from timeline (client guard)
  const deliveryEdits = useMemo(() => {
    if (!txn || !me) return 0;
    const items = Array.isArray(txn.timeline) ? txn.timeline : [];
    return items.filter((e) => {
      const byMe = String(e?.by || "") === String(me._id || "");
      const act = String(e?.action || "").toLowerCase();
      return (
        byMe &&
        (act.includes("seller_set_delivery") || act.includes("set_delivery"))
      );
    }).length;
  }, [txn, me]);
  const canEditDelivery = useMemo(() => {
    return (
      deliveryEdits < 3 &&
      ["ESCROW_FUNDED", "SELLER_ACCEPTED"].includes(txn?.status)
    );
  }, [deliveryEdits, txn]);

  const card =
    "rounded-2xl bg-white/95 shadow-md ring-1 ring-[#e6eeff] backdrop-blur";
  const sectionTitle =
    "text-[15px] font-semibold text-[#1f3b66] bg-[#eef4ff] rounded-lg px-3 py-2 inline-flex items-center gap-2";

  if (err) return <p className="text-red-600 mb-3">{err}</p>;
  if (!txn) return <p className="text-gray-500">Loading…</p>;

  // Meetup proposal state (who proposed last)
  const hasProposal =
    Boolean(txn.fulfillment?.meetupProposedAt) &&
    Boolean(txn.fulfillment?.meetupLocation);
  const proposedByMe =
    hasProposal &&
    me &&
    String(txn.fulfillment?.meetupProposedBy || "") === String(me._id || "");

  return (
    <div className="space-y-6">
      {/* Progress (UI-only stepper) */}
      {me && txn && (
        <Stepper
          className="px-1"
          current={3} // 👈 force step 3
          variant={isBuyer ? "buyer" : "seller"} // or just "buyer" / "seller"
        />
      )}

      {/* Header */}
      <div className={`${card} p-6`}>
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div className="text-sm text-[#6881b5]">Transaction</div>
            <h2 className="text-xl font-semibold text-[#1f2d4d] truncate">
              {txn.product?.title || "-"}
            </h2>
          </div>
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

        {/* Only the other party */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="rounded-xl bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff] md:col-span-2">
            <div className={sectionTitle}>
              <UserCircleIcon className="w-5 h-5" />
              {otherRoleLabel}
            </div>
            <div className="mt-3 space-y-1">
              <div className="font-medium text-gray-900">
                {otherParty?.name || otherParty?.email || "-"}
              </div>
              <div className="text-sm text-gray-600">{otherParty?.email}</div>
              {otherPhone && (
                <div className="text-sm text-gray-700 inline-flex items-center gap-1">
                  <PhoneIcon className="w-4 h-4" />
                  <a href={`tel:${otherPhone}`} className="underline">
                    {otherPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#e7ecf8]">
          <div className="text-sm text-gray-600">
            Updated {fmtBKK(txn.updatedAt || txn.createdAt)}
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

      {/* Fulfillment */}
      <div className={`${card} p-6`}>
        <div className={sectionTitle}>
          <TruckIcon className="w-5 h-5" />
          {method === "DELIVERY"
            ? "Delivery"
            : method === "MEETUP"
            ? "Meetup"
            : "Fulfillment"}
        </div>

        {/* Read-only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          <Field label="Method" value={method} icon={TruckIcon} />
          <Field
            label={method === "DELIVERY" ? "Ship/ETA" : "Meetup Time"}
            value={
              method === "DELIVERY"
                ? fmtBKK(txn.fulfillment?.scheduledAt)
                : fmtBKK(
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
          {/* Payout CTA for seller after completion (works for both Delivery & Meetup) */}
          {isSeller &&
            (txn.status === "SELLER_DELIVERED" ||
              txn.status === "MEETUP_COMPLETED") && (
              <div>
                <Link
                  href={`/my-orders/${id}/payout`}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[#325082] text-white hover:bg-[#2b446e]"
                >
                  Go to Payout
                </Link>
              </div>
            )}

          {method === "DELIVERY" &&
            isSeller &&
            ["SELLER_ACCEPTED", "DELIVERY_IN_PROGRESS"].includes(
              txn.status
            ) && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Ship/ETA (within {DELIVERY_MAX_DAYS} days)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      min={deliveryMin}
                      max={deliveryMax}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Choose a time from now up to {DELIVERY_MAX_DAYS} days
                      ahead.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Carrier
                    </label>
                    <input
                      type="text"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
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
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
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
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-3">
                    {txn.status === "SELLER_ACCEPTED" && (
                      <>
                        <button
                          disabled={busy || !canEditDelivery}
                          onClick={() => {
                            if (!validateDeliveryWindow(scheduledAt)) {
                              alert(
                                `Ship/ETA must be from now to ${DELIVERY_MAX_DAYS} days ahead.`
                              );
                              return;
                            }
                            if (!canEditDelivery) {
                              alert(
                                "You have reached the maximum of 3 delivery schedule changes."
                              );
                              return;
                            }
                            doPatch({
                              action: "seller_set_delivery",
                              scheduledAt: scheduledAt
                                ? new Date(scheduledAt).toISOString()
                                : null,
                              carrier,
                              tracking,
                              notes,
                            });
                          }}
                          className="px-4 py-2 rounded-lg bg-[#eef4ff] text-[#1f3b66] ring-1 ring-[#dbe6ff] hover:bg-[#e6f0ff]"
                        >
                          Save Delivery Details
                        </button>

                        <button
                          disabled={busy}
                          onClick={() => {
                            if (
                              scheduledAt &&
                              !validateDeliveryWindow(scheduledAt)
                            ) {
                              alert(
                                `Ship/ETA must be from now to ${DELIVERY_MAX_DAYS} days ahead.`
                              );
                              return;
                            }
                            doPatch({ action: "mark_delivery_in_progress" });
                          }}
                          className="px-4 py-2 rounded-lg bg-[#325082] text-white hover:bg-[#2b446e]"
                        >
                          Start Delivery
                        </button>
                      </>
                    )}

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

                  {txn.status === "SELLER_ACCEPTED" && (
                    <div className="text-[11px] text-gray-500">
                      {canEditDelivery
                        ? `${
                            3 - deliveryEdits
                          } edits left before starting delivery.`
                        : "Edit limit reached (3/3)."}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* MEETUP: propose/accept/complete */}
          {method === "MEETUP" &&
            ["SELLER_ACCEPTED", "DELIVERY_IN_PROGRESS"].includes(
              txn.status
            ) && (
              <div className="space-y-3">
                {/* Inputs + propose/accept only AFTER seller has accepted */}
                {txn.status === "SELLER_ACCEPTED" && (
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
                          min={meetMin}
                          max={meetMax}
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                          Choose a time from now up to {MEETUP_MAX_DAYS} days
                          ahead.
                        </p>
                      </div>
                    </div>

                    {/* Propose / Accept */}
                    <div className="flex flex-wrap gap-3">
                      {(!hasProposal || !proposedByMe) && (
                        <button
                          disabled={
                            busy ||
                            !meetLoc ||
                            !meetTime ||
                            !validateMeetupWindow(meetTime)
                          }
                          onClick={() => {
                            if (!validateMeetupWindow(meetTime)) {
                              alert(
                                `Please pick a meetup time from now to ${MEETUP_MAX_DAYS} days ahead.`
                              );
                              return;
                            }
                            doPatch({
                              action: "propose_meetup",
                              meetupLocation: meetLoc,
                              meetupProposedAt: new Date(
                                meetTime
                              ).toISOString(),
                            });
                          }}
                          className="px-4 py-2 rounded-lg bg-[#eef4ff] text-[#1f3b66] ring-1 ring-[#dbe6ff] hover:bg-[#e6f0ff]"
                        >
                          Propose Meetup
                        </button>
                      )}

                      {hasProposal && me && !proposedByMe && (
                        <button
                          disabled={busy}
                          onClick={() => doPatch({ action: "accept_meetup" })}
                          className="px-4 py-2 rounded-lg bg-[#325082] text-white hover:bg-[#2b446e]"
                        >
                          Accept Proposal
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* After delivery started, only “mark completed” remains */}
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
                    Current proposal: <b>{txn.fulfillment.meetupLocation}</b> at{" "}
                    <b>{fmtBKK(txn.fulfillment.meetupProposedAt)}</b>
                  </div>
                )}
              </div>
            )}

          {/* Buyer confirm */}
          {isBuyer &&
            (txn.status === "SELLER_DELIVERED" ||
              txn.status === "MEETUP_COMPLETED") && (
              <div className="mt-4 space-y-2">
                {/* Countdown banner */}
                {txn.autoConfirmAt && (
                  <div
                    className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900 text-sm"
                    aria-live="polite"
                  >
                    Please confirm you’ve received the item. Otherwise this
                    order will be auto-confirmed in{" "}
                    <b className="font-mono tabular-nums">
                      {formatRemaining(remainMs)}
                    </b>
                    .
                  </div>
                )}

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
                <div className="text-sm text-gray-800">{e.action || "-"}</div>
                <div className="text-xs text-gray-500">
                  {e.at ? fmtBKK(e.at) : "-"}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-sm text-gray-500">No events yet.</div>
        )}
      </div>
    </div>
  );
}
