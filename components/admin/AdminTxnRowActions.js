"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import { getStatusLabel } from "@/components/StatusPill";

const STATUSES_BY_KIND = {
  BUY_SELL: [
    "PENDING_PAYMENT",
    "PAYMENT_SUCCESSFUL",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "CANCELLED_BY_BUYER",
    "CANCELLED_BY_SELLER",
    "REJECTED_BY_ADMIN",
    "PAID_OUT",
  ],
  DONATION: [
    "AWAITING_DONOR",
    "SELLER_ACCEPTED",
    "DELIVERY_IN_PROGRESS",
    "MEETUP_COMPLETED",
    "BUYER_CONFIRMED",
    "CANCELLED_BY_SELLER",
  ],
};

export default function AdminTxnRowActions({
  txnId,
  currentStatus,
  kind = "BUY_SELL",
  onDone,
}) {
  const [status, setStatus] = useState(currentStatus);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const allowedStatuses = STATUSES_BY_KIND[kind] || [];

  async function updateStatus() {
    setBusy(true);
    setErr("");

    let reason = "";
    if (status === "REJECTED_BY_ADMIN" || status === "CANCELLED_BY_SELLER") {
      reason = window.prompt("Reason (required):")?.trim();
      if (!reason) {
        setBusy(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/transactions/${txnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_status",
          status,
          reason,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      onDone?.({ id: txnId, newStatus: data.status });
    } catch (e) {
      setErr(e.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Small status selector */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={busy}
        className="h-[30px] w-40 px-1 rounded-md border border-gray-300 bg-white text-xs
                   focus:outline-none focus:ring-1 focus:ring-[#325082]"
      >
        {allowedStatuses.map((s) => (
          <option key={s} value={s}>
            {getStatusLabel(s, kind)}
          </option>
        ))}
      </select>

      {/* Right-aligned Update button */}
      <div className="flex justify-end">
        <ActionButton
          text="Update"
          variant="primaryClick"
          onClick={updateStatus}
          disabled={busy}
          className="h-[28px] px-3 text-xs"
        />
      </div>

      {err && (
        <span className="text-[11px] text-red-600 leading-tight">{err}</span>
      )}
    </div>
  );
}
