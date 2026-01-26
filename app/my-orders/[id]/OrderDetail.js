"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/StatusPill";
import {
  TruckIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { fmtBKK } from "@/utils/timeAgo";
import Stepper from "@/components/Stepper";
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";
import Timeline from "@/components/Timeline";
import TxnChat from "@/components/TxnChat";

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
  const router = useRouter();

  // refresh once when the timer hits zero (server GET will flip to BUYER_CONFIRMED)
  const didRefreshRef = useRef(false);
  useEffect(() => {
    if (remainMs === 0 && !didRefreshRef.current) {
      didRefreshRef.current = true;
      setTimeout(() => {
        load().finally(() => {
          didRefreshRef.current = false;
        });
      }, 800);
    }
  }, [remainMs]);

  const kind = txn?.kind || "BUY_SELL";
  const isBuyer = me && txn && String(txn.buyer?._id) === String(me._id);
  const isSeller = me && txn && String(txn.seller?._id) === String(me._id);

  const otherParty = isSeller ? txn?.buyer : txn?.seller;
  const otherRoleLabel = labelParty(kind, isSeller);
  const otherPhone = otherParty?.phone || "";

  async function load() {
    const [txnRes, meRes] = await Promise.all([
      fetch(`/api/transactions/${id}`, { cache: "no-store" }),
      fetch(`/api/users/me`, { cache: "no-store" }).catch(() => null),
    ]);

    if (!txnRes.ok) throw new Error(await txnRes.text());
    const data = await txnRes.json();
    setTxn(data);

    if (meRes?.ok) {
      const m = await meRes.json();
      setMe(m?.user || m);
    }
  }

  // initial load
  useEffect(() => {
    load().catch((e) => setErr(e.message || "Failed to load order"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // auto-confirm timer
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

  async function doPatch(payload) {
    try {
      setBusy(true);
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      if (isBuyer && payload?.action === "buyer_confirm") {
        window.dispatchEvent(new CustomEvent("overlay:show"));
        router.push(`/review/${id}`);
        return;
      }

      await load();
    } catch (e) {
      alert(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  const card =
    "rounded-[3px] bg-white/95 shadow-md ring-1 ring-[#e6eeff] backdrop-blur";
  const sectionTitle =
    "text-lg font-semibold text-[#325082] bg-transparent border-[#325082] rounded-[3px] inline-flex items-center gap-2";

  if (err) return <p className="text-red-600 mb-3">{err}</p>;
  if (!txn) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Progress (UI-only stepper) */}
      {me && txn && (
        <Stepper
          className="px-1"
          current={2}
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

        {/* Party info + Product info */}
        <div className="mt-6 flex flex-col md:flex-row gap-6">
          <div className="rounded-[3px] bg-[#f6f9ff] p-4 ring-1 ring-[#e6eeff] md:flex-1">
            <div className={sectionTitle}>
              <UserCircleIcon className="w-5 h-5" />
              {otherRoleLabel}
            </div>

            {(() => {
              const CONTACT_OK_STATUSES = new Set([
                "PAYMENT_SUCCESSFUL",
                "SELLER_ACCEPTED",
                "DELIVERY_IN_PROGRESS",
                "SELLER_PROOF_UPLOADED",
                "BUYER_CONFIRMED",
                "PAID_OUT",
              ]);
              const canShowContact = CONTACT_OK_STATUSES.has(txn?.status);

              return (
                <div className="mt-3 space-y-1">
                  <div className="font-medium text-gray-900">
                    {otherParty?.name || otherParty?.email || "-"}
                  </div>

                  <div className="text-sm text-gray-600">
                    {canShowContact ? otherParty?.email || "—" : ""}
                  </div>

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

            {/* Buyer: Confirm Received */}
            {isBuyer && txn.status === "DELIVERY_IN_PROGRESS" && (
              <ActionButton
                text="Confirm Received"
                variant="primaryClick"
                disabled={busy}
                onClick={() => doPatch({ action: "buyer_confirm" })}
              />
            )}

            {/* Buyer: Review */}
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

            {/* Seller: payout link */}
            {kind !== "DONATION" &&
              isSeller &&
              [
                "SELLER_DELIVERED",
                "MEETUP_COMPLETED",
                "BUYER_CONFIRMED",
                "PAID_OUT",
              ].includes(txn.status) && (
                <Link href={`/my-orders/${id}/payout`}>
                  <ActionButton text="View Payout" variant="primaryClick" />
                </Link>
              )}

            {/* Donor (Donation): complete */}
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

      {/* ✅ Fulfillment (Chat) */}
      <div className={`${card} p-6`}>
        <div className={sectionTitle}>
          <TruckIcon className="w-5 h-5" />
          Fulfillment (Chat)
        </div>

        <TxnChat
          txnId={id}
          meId={me?._id}
          title={`Chat with ${otherRoleLabel}`}
          onStatusChange={() => load()} // refresh txn if first message flips status
        />
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
