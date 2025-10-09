"use client";

import { fmtBKK } from "@/utils/timeAgo";

/** Base labels for timeline actions */
export const TIMELINE_LABELS = {
  ORDER_CREATED: "Order created",
  PAYMENT_WINDOW_STARTED: "Payment window started",
  BUYER_UPLOADED_RECEIPT: "Buyer uploaded payment slip",
  ADMIN_VERIFIED_PAYMENT: "Admin verified payment slip",
  SELLER_ACCEPTED: "Seller accepted the order",
  SELLER_SET_DELIVERY: "Seller set delivery details",
  DELIVERY_STARTED: "Delivery started",
  SELLER_DELIVERED: "Seller marked as delivered",
  MEETUP_PROPOSED: "Meetup proposed",
  MEETUP_ACCEPTED: "Meetup accepted",
  MEETUP_COMPLETED: "Meetup completed",
  BUYER_CONFIRMED: "Buyer confirmed received",
  AUTO_CONFIRMED_AFTER_3_DAYS: "Order auto-confirmed received",
  ADMIN_PAID_OUT: "Payout released to seller",
  CANCELLED_BY_BUYER: "Buyer cancelled the order",
  CANCELLED_BY_SELLER: "Seller cancelled the order",
  AUTO_CANCELLED_EXPIRED: "Order auto-cancelled (Time Out)",
  REJECTED_BY_ADMIN: "Admin rejected the order",

  // instant donation creation
  DONATION_INSTANT_CREATED: "Instant donation requested",
};

/** Donation-specific label overrides */
const DONATION_LABEL_OVERRIDES = {
  SELLER_ACCEPTED: "Donor accepted the request",
  BUYER_CONFIRMED: "Recipient confirmed received",
  CANCELLED_BY_SELLER: "Donor cancelled the order",
};

/** Get a friendly label with kind-aware overrides */
export function toFriendlyAction(action, kind = "BUY_SELL") {
  if (!action) return "-";
  const key = String(action).toUpperCase();

  if (kind === "DONATION" && DONATION_LABEL_OVERRIDES[key]) {
    return DONATION_LABEL_OVERRIDES[key];
  }

  return (
    TIMELINE_LABELS[key] ||
    key
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Timeline
 */
export default function Timeline({
  kind = "BUY_SELL",
  events = [],
  reverse = true,
  maxHeight = "",
  compact = false,
  className = "",
  emptyText = "No events yet.",
}) {
  const raw = Array.isArray(events) ? [...events] : [];
  if (reverse) raw.reverse();

  const data = raw.map((e) => ({
    label: toFriendlyAction(e?.action, kind),
    at: e?.at ? new Date(e.at) : null,
  }));

  const outerChrome = compact
    ? `border border-slate-200 rounded-md ${maxHeight} overflow-y-auto p-3`
    : "";

  return (
    <div className={`${outerChrome} ${className}`.trim()}>
      {data.length > 0 ? (
        <ul className={compact ? "space-y-2" : "mt-4 space-y-2"}>
          {data.map((e, i) => (
            <li
              key={i}
              className={
                compact
                  ? "flex items-center justify-between"
                  : "flex items-center justify-between rounded-[3px] shadow-sm bg-[#f8fbff] ring-1 ring-[#e6eeff] px-3 py-2"
              }
            >
              <div className="text-sm text-slate-800">{e.label}</div>
              <time
                className="text-xs text-slate-500"
                dateTime={e.at ? e.at.toISOString() : undefined}
              >
                {e.at ? fmtBKK(e.at) : "-"}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className={
            compact ? "text-sm text-slate-500" : "mt-4 text-sm text-gray-500"
          }
        >
          {emptyText}
        </div>
      )}
    </div>
  );
}
