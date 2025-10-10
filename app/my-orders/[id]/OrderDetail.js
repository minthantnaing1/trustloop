// app/my-orders/[id]/OrderDetail.js
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";
import Timeline from "@/components/Timeline";

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

function labelParty(kind, isSellerView) {
  if (kind === "DONATION") return isSellerView ? "Recipient" : "Donor";
  return isSellerView ? "Buyer" : "Seller";
}

function productHref(kind, isSellerView, productId) {
  if (kind === "DONATION") return `/donation/${productId}`;
  return isSellerView ? `/sell/${productId}` : `/buy/${productId}`;
}

function totalText(kind, total) {
  return kind === "DONATION"
    ? "Free"
    : `฿${Number(total || 0).toLocaleString()}`;
}

export default function OrderDetail({ id }) {
  const [txn, setTxn] = useState(null);
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [remainMs, setRemainMs] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const router = useRouter();

  // refresh once when the timer hits zero (server GET will flip to BUYER_CONFIRMED)
  const didRefreshRef = useRef(false);
  useEffect(() => {
    if (remainMs === 0 && !didRefreshRef.current) {
      didRefreshRef.current = true;
      // small delay lets server-side auto-confirm persist
      setTimeout(() => {
        load().finally(() => {
          // allow future refreshes if state changes again
          didRefreshRef.current = false;
        });
      }, 800);
    }
  }, [remainMs]);

  // delivery inputs
  const [scheduledAt, setScheduledAt] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState("");

  // meetup inputs
  const [meetLoc, setMeetLoc] = useState("");
  const [meetTime, setMeetTime] = useState("");
  const [meetWarn, setMeetWarn] = useState("");
  const [sameWarn, setSameWarn] = useState("");

  // min/max windows
  const meetMin = useMemo(() => nowLocalInput(), []);
  const meetMax = useMemo(() => addDaysLocalInput(MEETUP_MAX_DAYS), []);
  const deliveryMin = useMemo(() => deliveryMinLocalInput(), []);
  const deliveryMax = useMemo(() => deliveryMaxLocalInput(), []);

  // deliver/meetup
  const [deliveredWarn, setDeliveredWarn] = useState("");
  const [meetupWarnClick, setMeetupWarnClick] = useState("");

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

    // inside load()
    if (meRes?.ok) {
      const m = await meRes.json();
      setMe(m?.user || m); // <- store the real user document
    }
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
  const kind = txn?.kind || "BUY_SELL";
  const method = txn?.fulfillment?.method || "—";

  const otherParty = isSeller ? txn?.buyer : txn?.seller;
  const otherRoleLabel = labelParty(kind, isSeller);
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

      // Seller/Donor → Delivered/Meetup completed
      if (
        isSeller &&
        (payload?.action === "seller_mark_delivered" ||
          payload?.action === "mark_meetup_completed")
      ) {
        if (kind !== "DONATION") {
          // Buy & Sell: go to payout
          window.dispatchEvent(new CustomEvent("overlay:show"));
          router.push(`/my-orders/${id}/payout`);
          return;
        } else {
          // Donation (donor): also go to the (repurposed) payout page
          window.dispatchEvent(new CustomEvent("overlay:show"));
          router.push(`/my-orders/${id}/payout`);
          return;
        }
      }

      // Buyer/Recipient → Confirm (both kinds go to review page)
      if (isBuyer && payload?.action === "buyer_confirm") {
        window.dispatchEvent(new CustomEvent("overlay:show"));
        router.push(`/review/${id}`);
        return;
      }

      // Other mutations: refresh current page state
      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  // times as numbers (ms) for comparisons
  const schedAtMs = txn?.fulfillment?.scheduledAt
    ? new Date(txn.fulfillment.scheduledAt).getTime()
    : null;

  const meetupAtMs =
    txn?.fulfillment?.meetupScheduledAt || txn?.fulfillment?.meetupProposedAt
      ? new Date(
          txn.fulfillment.meetupScheduledAt || txn.fulfillment.meetupProposedAt
        ).getTime()
      : null;

  // Keep "now" fresh while delivery/meetup completion buttons might unlock
  useEffect(() => {
    const active =
      txn &&
      txn.status === "DELIVERY_IN_PROGRESS" &&
      (txn.fulfillment?.method === "MEETUP" ||
        txn.fulfillment?.method === "DELIVERY");

    if (!active) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [txn?.status, txn?.fulfillment?.method]);

  const canMarkDeliveredNow =
    method === "DELIVERY" &&
    txn.status === "DELIVERY_IN_PROGRESS" &&
    Number.isFinite(schedAtMs) &&
    nowMs >= schedAtMs;

  const canMarkMeetupNow =
    method === "MEETUP" &&
    txn.status === "DELIVERY_IN_PROGRESS" &&
    Number.isFinite(meetupAtMs) &&
    nowMs >= meetupAtMs;

  useEffect(() => {
    if (canMarkDeliveredNow && deliveredWarn) setDeliveredWarn("");
  }, [canMarkDeliveredNow, deliveredWarn]);

  useEffect(() => {
    if (canMarkMeetupNow && meetupWarnClick) setMeetupWarnClick("");
  }, [canMarkMeetupNow, meetupWarnClick]);

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
    "rounded-[3px] bg-white/95 shadow-md ring-1 ring-[#e6eeff] backdrop-blur";
  const sectionTitle =
    "text-lg font-semibold text-[#325082] bg-transparent border-[#325082] rounded-[3px] inline-flex items-center gap-2";

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

  // current proposal vs your inputs (to prevent re-submitting identical proposal)
  const currentLoc = txn.fulfillment?.meetupLocation || "";
  const currentTimeIso = txn.fulfillment?.meetupProposedAt
    ? new Date(txn.fulfillment.meetupProposedAt).toISOString()
    : "";
  const inputTimeIso = meetTime ? new Date(meetTime).toISOString() : "";
  const isSameProposal =
    currentLoc.trim() === (meetLoc || "").trim() &&
    currentTimeIso === inputTimeIso;

  // compare form inputs vs saved fulfillment (normalize date to ISO)
  const savedScheduledIso = txn?.fulfillment?.scheduledAt
    ? new Date(txn.fulfillment.scheduledAt).toISOString()
    : "";
  const inputScheduledIso = scheduledAt
    ? new Date(scheduledAt).toISOString()
    : "";

  const isDeliveryUnchanged =
    savedScheduledIso === inputScheduledIso &&
    (carrier || "") === (txn?.fulfillment?.carrier || "") &&
    (tracking || "") === (txn?.fulfillment?.tracking || "") &&
    (notes || "") === (txn?.fulfillment?.notes || "");

  return (
    <div className="space-y-6">
      {/* Progress (UI-only stepper) */}
      {me && txn && (
        <Stepper
          className="px-1"
          current={3} // always step 3 here
          variant={
            kind === "DONATION"
              ? isSeller
                ? "donor"
                : "recipient"
              : isBuyer
              ? "buyer"
              : "seller"
          }
        />
      )}

      {/* Header */}
      <div className={`${card} p-6`}>
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div className="text-lg font-bold text-[#325082]">
              {kind === "DONATION" ? "Donation" : "Buy & Sell"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={txn.status} kind={kind} />
            <div className="text-sm sm:text-base text-[#1f3b66]">
              <span className="font-semibold">Total:</span>{" "}
              <span className="font-bold">{totalText(kind, txn.total)}</span>
            </div>
          </div>
        </div>

        {/* Party info (left) + Product info (right) */}
        <div className="mt-6 flex flex-col md:flex-row gap-6">
          {/* Left: Other party */}
          <div className="rounded-[3px] bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff] md:flex-1">
            <div className={sectionTitle}>
              <UserCircleIcon className="w-5 h-5" />
              {otherRoleLabel}
            </div>

            {(() => {
              // show contact only after seller has accepted (or later states)
              const CONTACT_OK_STATUSES = new Set([
                "SELLER_ACCEPTED",
                "DELIVERY_IN_PROGRESS",
                "SELLER_DELIVERED",
                "MEETUP_COMPLETED",
                "BUYER_CONFIRMED",
                "PAID_OUT",
              ]);
              const canShowContact = CONTACT_OK_STATUSES.has(txn?.status);

              return (
                <div className="mt-3 space-y-1">
                  <div className="font-medium text-gray-900">
                    {otherParty?.name || otherParty?.email || "-"}
                  </div>

                  {/* Email */}
                  <div className="text-sm text-gray-600">
                    {canShowContact ? otherParty?.email || "—" : ""}
                  </div>

                  {/* Phone */}
                  {canShowContact && otherPhone && (
                    <a
                      href={`tel:${otherPhone}`}
                      className="flex items-center gap-1 text-sm text-[#325082] hover:underline"
                    >
                      <PhoneIcon className="w-4 h-4" />
                      {otherPhone}
                    </a>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Right: Product info */}
          <div className="rounded-[3px] bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff] md:flex-1">
            <div className="text-lg font-bold text-[#325082] mb-2">
              {kind === "DONATION"
                ? isSeller
                  ? "My Donation:"
                  : "Donation Item:"
                : isSeller
                ? "My Product:"
                : "Product:"}
            </div>
            <h3 className="text-lg font-semibold text-[#325082]">
              {txn.product?.title || "-"}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>
                  Category:{" "}
                  <span className="font-medium">
                    {txn.product?.category || "-"}
                  </span>
                </span>
                <span>
                  Condition:{" "}
                  <span className="font-medium">
                    {txn.product?.condition || "-"}
                  </span>
                </span>
              </div>
              <div className="mt-2.5">
                Description:{" "}
                <span className="font-medium">
                  {txn.product?.description || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#e7ecf8]">
          <div className="text-sm text-gray-600">
            Updated {fmtBKK(txn.updatedAt || txn.createdAt)}
          </div>
          {/* Buttons on the right */}
          <div className="flex items-center gap-6 text-sm">
            {txn.buyerReceiptUrl && (
              <SlipLink url={txn.buyerReceiptUrl} title="Buyer Payment Slip">
                {isBuyer ? (
                  <>View My Payment Slip</>
                ) : (
                  <>View Buyer Payment Slip</>
                )}
              </SlipLink>
            )}

            <Link
              href={productHref(kind, isSeller, txn.product?._id || "")}
              className="text-sm underline text-[#325082] hover:text-[#6881b5] underline-offset-2"
            >
              {kind === "DONATION"
                ? isSeller
                  ? "My Donation Details"
                  : "Donation Details"
                : isSeller
                ? "My Product Details"
                : "Product Details"}
            </Link>

            {/* Buyer/Recipient: Order Summary & Review */}
            {isBuyer &&
              (txn.status === "BUYER_CONFIRMED" ||
                txn.status === "PAID_OUT") && (
                <Link href={`/review/${id}`}>
                  <ActionButton
                    text="Order Summary & Review"
                    variant="primaryClick"
                  />
                </Link>
              )}

            {/* Seller (Buy & Sell): View Payout */}
            {kind !== "DONATION" &&
              isSeller &&
              (txn.status === "SELLER_DELIVERED" ||
                txn.status === "MEETUP_COMPLETED" ||
                txn.status === "BUYER_CONFIRMED" ||
                txn.status === "PAID_OUT") && (
                <Link href={`/my-orders/${id}/payout`}>
                  <ActionButton text="View Payout" variant="primaryClick" />
                </Link>
              )}

            {/* Donor (Donation): Donation Summary & Review */}
            {kind === "DONATION" &&
              isSeller &&
              txn.status === "BUYER_CONFIRMED" && (
                <Link href={`/my-orders/${id}/payout`}>
                  <ActionButton
                    text="Complete & Review"
                    variant="primaryClick"
                  />
                </Link>
              )}
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
            label={
              method === "DELIVERY"
                ? isBuyer
                  ? "My Address"
                  : "Buyer Address"
                : "Meetup Location"
            }
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
              <Field
                label="Notes"
                value={txn.fulfillment?.notes || "—"}
                icon={ClipboardDocumentListIcon}
              />
            </>
          )}
        </div>

        {/* Role-aware controls */}
        <div className="mt-6 border-t pt-4 border-[#e7ecf8]">
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
                      onChange={(e) => {
                        setScheduledAt(e.target.value);
                        setDeliveryMsg("");
                      }}
                      min={deliveryMin}
                      max={deliveryMax}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-[3px] border border-gray-300 shadow-sm px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                    <p className="text-[12px] text-gray-500 mt-1">
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
                      onChange={(e) => {
                        setCarrier(e.target.value);
                        setDeliveryMsg("");
                      }}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-[3px] border border-gray-300 shadow-sm px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Tracking
                    </label>
                    <input
                      type="text"
                      value={tracking}
                      onChange={(e) => {
                        setTracking(e.target.value);
                        setDeliveryMsg("");
                      }}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-[3px] border border-gray-300 shadow-sm px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setDeliveryMsg("");
                      }}
                      disabled={busy || txn.status === "DELIVERY_IN_PROGRESS"}
                      className="w-full rounded-[3px] border border-gray-300 shadow-sm px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {txn.status === "SELLER_ACCEPTED" && (
                      <>
                        <ActionButton
                          text="Set Delivery Details"
                          variant="outlineClick"
                          disabled={busy || !canEditDelivery}
                          onClick={() => {
                            setDeliveryMsg("");

                            // must set Ship/ETA
                            if (!scheduledAt) {
                              setDeliveryMsg(
                                "Set a Ship/ETA time before setting delivery details."
                              );
                              return;
                            }
                            if (!validateDeliveryWindow(scheduledAt)) {
                              setDeliveryMsg(
                                `Ship/ETA must be from now to ${DELIVERY_MAX_DAYS} days ahead.`
                              );
                              return;
                            }

                            // block if nothing changed
                            if (isDeliveryUnchanged) {
                              setDeliveryMsg(
                                "Nothing has changed to be updated."
                              );
                              return;
                            }

                            doPatch({
                              action: "seller_set_delivery",
                              scheduledAt: new Date(scheduledAt).toISOString(),
                              carrier,
                              tracking,
                              notes,
                            });
                          }}
                        />

                        <ActionButton
                          text="Start Delivery"
                          variant="primaryClick"
                          disabled={busy}
                          onClick={() => {
                            setDeliveryMsg("");
                            if (!scheduledAt) {
                              setDeliveryMsg(
                                "Set a Ship/ETA time before starting delivery."
                              );
                              return;
                            }
                            if (!validateDeliveryWindow(scheduledAt)) {
                              setDeliveryMsg(
                                `Ship/ETA must be from now to ${DELIVERY_MAX_DAYS} days ahead.`
                              );
                              return;
                            }
                            doPatch({ action: "mark_delivery_in_progress" });
                          }}
                        />

                        {deliveryMsg && (
                          <span className="text-[12px] text-amber-700">
                            {deliveryMsg}
                          </span>
                        )}
                      </>
                    )}

                    {txn.status === "DELIVERY_IN_PROGRESS" && (
                      <div className="flex flex-col gap-1">
                        <ActionButton
                          text="Mark Delivered"
                          variant="primaryClick"
                          disabled={
                            busy /* keep clickable even if blocked by time */
                          }
                          onClick={() => {
                            if (!canMarkDeliveredNow) {
                              setDeliveredWarn(
                                `You can only mark as delivered after the scheduled time: ${fmtBKK(
                                  txn.fulfillment?.scheduledAt
                                )}.`
                              );
                              return;
                            }
                            setDeliveredWarn("");
                            doPatch({ action: "seller_mark_delivered" });
                          }}
                        />

                        {deliveredWarn && (
                          <span className="text-[12px] text-amber-700">
                            {deliveredWarn}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {txn.status === "SELLER_ACCEPTED" && (
                    <div className="text-[12px] text-gray-500">
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
                          onChange={(e) => {
                            setMeetLoc(e.target.value);
                            setMeetWarn("");
                            setSameWarn("");
                          }}
                          className="w-full rounded-[3px] border border-gray-300 px-3 py-2 text-sm"
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
                          onChange={(e) => {
                            setMeetTime(e.target.value);
                            setMeetWarn("");
                            setSameWarn("");
                          }}
                          min={meetMin}
                          max={meetMax}
                          className="w-full rounded-[3px] border border-gray-300 px-3 py-2 text-sm"
                        />
                        <p className="text-[12px] text-gray-500 mt-1">
                          Choose a time from now up to {MEETUP_MAX_DAYS} days
                          ahead.
                        </p>
                      </div>
                    </div>

                    {/* Propose / Accept */}
                    <div className="flex flex-wrap gap-3">
                      {(!hasProposal || !proposedByMe) && (
                        <ActionButton
                          text="Propose Meetup"
                          variant="primaryClick"
                          disabled={busy}
                          onClick={() => {
                            setMeetWarn("");
                            setSameWarn("");

                            if (!meetLoc || !meetTime) {
                              setMeetWarn(
                                "Please set both Location and Proposed Time before pressing Propose Meetup Button."
                              );
                              return;
                            }
                            if (!validateMeetupWindow(meetTime)) {
                              setMeetWarn(
                                `Please pick a meetup time from now to ${MEETUP_MAX_DAYS} days ahead.`
                              );
                              return;
                            }
                            if (isSameProposal) {
                              setSameWarn(
                                "You're proposing the same location and time as the current proposal. Change something to propose again."
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
                        />
                      )}

                      {hasProposal && me && !proposedByMe && (
                        <ActionButton
                          text="Accept Proposal"
                          variant="outlineClick"
                          disabled={busy}
                          onClick={() => doPatch({ action: "accept_meetup" })}
                        />
                      )}
                    </div>

                    {/* Warnings under the buttons */}
                    {meetWarn && (
                      <div className="text-[12px] text-amber-700">
                        {meetWarn}
                      </div>
                    )}
                    {sameWarn && (
                      <div className="text-[12px] text-amber-700">
                        {sameWarn}
                      </div>
                    )}
                  </>
                )}

                {/* After delivery started, only “mark completed” remains */}
                {isSeller && txn.status === "DELIVERY_IN_PROGRESS" && (
                  <div className="flex flex-col gap-1">
                    <ActionButton
                      text="Mark Meetup Completed"
                      variant="primaryClick"
                      disabled={busy}
                      onClick={() => {
                        if (!canMarkMeetupNow) {
                          setMeetupWarnClick(
                            `You can only complete the meetup after ${fmtBKK(
                              txn.fulfillment?.meetupScheduledAt ||
                                txn.fulfillment?.meetupProposedAt
                            )}.`
                          );
                          return;
                        }
                        setMeetupWarnClick("");
                        doPatch({ action: "mark_meetup_completed" });
                      }}
                    />

                    {meetupWarnClick && (
                      <span className="text-[12px] text-amber-700">
                        {meetupWarnClick}
                      </span>
                    )}
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
                    {kind === "DONATION"
                      ? "Please confirm you have received the donation item. Otherwise this order will be auto-confirmed in "
                      : "Please confirm you have received the item. Otherwise this order will be auto-confirmed in "}
                    <b className="font-mono tabular-nums">
                      {formatRemaining(remainMs)}
                    </b>
                    .
                  </div>
                )}

                <ActionButton
                  text="Confirm Received"
                  variant="primaryClick"
                  disabled={busy}
                  onClick={() => doPatch({ action: "buyer_confirm" })}
                />
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
        <Timeline events={txn.timeline} kind={txn.kind} />
      </div>
    </div>
  );
}
