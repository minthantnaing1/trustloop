// components/Timeline.js
"use client";

import { fmtBKK } from "@/utils/timeAgo";

/** Central labels for timeline actions (keep in sync with API pushes) */
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
  // Both keys supported; API currently uses the latter:
  AUTO_CONFIRMED: "Order auto-confirmed",
  AUTO_CONFIRMED_AFTER_3_DAYS: "Order auto-confirmed",
  ADMIN_PAID_OUT: "Payout released to seller",
  CANCELLED_BY_BUYER: "Buyer cancelled the order",
  CANCELLED_BY_SELLER: "Seller cancelled the order",
  AUTO_CANCELLED_EXPIRED: "Order auto-cancelled (Time Out)",
  REJECTED_BY_ADMIN: "Admin rejected the order",
};

export function toFriendlyAction(action) {
  if (!action) return "-";
  return (
    TIMELINE_LABELS[action] ||
    action
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Timeline
 * props:
 * - events: array of { at: Date|string, by?: userId, action: string, meta?: any }
 * - reverse: boolean (default true) -> most recent first
 * - maxHeight: optional tailwind class e.g. "max-h-40" to clamp height with scroll
 * - compact: boolean (tight rows, minimal chrome) for list view
 * - className: extra classes on the outer container
 * - emptyText: string shown when there are no events
 */
export default function Timeline({
  events = [],
  reverse = true,
  maxHeight = "",
  compact = false,
  className = "",
  emptyText = "No events yet.",
}) {
  const data = Array.isArray(events) ? [...events] : [];
  if (reverse) data.reverse();

  const outerChrome = compact
    ? `border border-slate-200 rounded-md ${maxHeight} overflow-y-auto p-3`
    : "";

  return (
    <div className={`${outerChrome} ${className}`.trim()}>
      {data.length > 0 ? (
        <ul className={compact ? "space-y-2" : "mt-4 space-y-2"}>
          {data.map((e, i) => {
            const label = toFriendlyAction(e?.action);
            const at = e?.at ? new Date(e.at) : null;

            return (
              <li
                key={i}
                className={
                  compact
                    ? "flex items-center justify-between"
                    : "flex items-center justify-between rounded-[3px] shadow-sm bg-[#f8fbff] ring-1 ring-[#e6eeff] px-3 py-2"
                }
              >
                <div className="text-sm text-slate-800">{label}</div>
                <time
                  className="text-xs text-slate-500"
                  dateTime={at ? at.toISOString() : undefined}
                >
                  {at ? fmtBKK(at) : "-"}
                </time>
              </li>
            );
          })}
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
