"use client";

import { fmtBKK } from "@/utils/timeAgo";

/** Only actions that exist in your current system (Stripe + your routes) */
export const TIMELINE_LABELS = {
  // Core
  ORDER_CREATED: "Order created",

  // Stripe flow
  STRIPE_PAYMENT_CONFIRMED: "Stripe payment Successful",
  STRIPE_FEE_RECORDED: "Stripe fee recorded",
  PAYMENT_FAILED: "Payment failed",

  // Seller / proof / confirm
  CHAT_STARTED: "Delivery chat started",
  SELLER_PROOF_UPLOADED: "Seller uploaded delivery proof",
  BUYER_CONFIRMED: "Buyer confirmed received",
  AUTO_CONFIRMED_AFTER_3_DAYS: "Order auto-confirmed received",

  // Cancellation
  CANCELLED_BY_BUYER: "Buyer cancelled the order",
  CANCELLED_BY_SELLER: "Seller cancelled the order",
  AUTO_CANCELLED_EXPIRED: "Order auto-cancelled (time out)",

  // Admin operations
  ADMIN_STATUS_OVERRIDE: "Admin changed order status",
  ADMIN_REFUNDED_BUYER: "Admin refunded buyer",
  ADMIN_PAID_OUT: "Payout released to seller",
};

/** Donation wording overrides (label only) */
const DONATION_LABEL_OVERRIDES = {
  SELLER_ACCEPTED: "Donor accepted the request",
  SELLER_PROOF_UPLOADED: "Donor uploaded delivery proof",
  BUYER_CONFIRMED: "Recipient confirmed received",
  CANCELLED_BY_SELLER: "Donor cancelled the request",
};

/** Friendly label with kind-aware override */
export function toFriendlyAction(action, kind = "BUY_SELL") {
  if (!action) return "-";
  const key = String(action).toUpperCase();

  if (
    String(kind).toUpperCase() === "DONATION" &&
    DONATION_LABEL_OVERRIDES[key]
  ) {
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

/** Only show extra detail for ADMIN_STATUS_OVERRIDE: which status was set */
function overrideDetail(e) {
  const action = String(e?.action || "").toUpperCase();
  if (action !== "ADMIN_STATUS_OVERRIDE") return "";

  const st = String(e?.meta?.status || "").trim();
  return st ? `→ ${st}` : "";
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
    detail: overrideDetail(e),
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
              <div className="text-sm text-slate-800">
                {e.label}
                {e.detail ? (
                  <span className="text-slate-500 font-medium">
                    {" "}
                    {e.detail}
                  </span>
                ) : null}
              </div>

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
