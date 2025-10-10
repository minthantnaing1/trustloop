"use client";

import { STATUS_CODES, getStatusLabel } from "@/components/StatusPill";

/**
 * Only show statuses that matter per kind.
 * BUY_SELL: everything except AWAITING_DONOR
 * DONATION: meetup-only flow + donor/recipient wording; no admin/buyer cancel; no payment steps.
 */
const STATUSES_BY_KIND = {
  BUY_SELL: STATUS_CODES.filter((s) => s !== "AWAITING_DONOR"),
  DONATION: [
    "AWAITING_DONOR",
    "SELLER_ACCEPTED",
    "DELIVERY_IN_PROGRESS",
    "MEETUP_COMPLETED",
    "BUYER_CONFIRMED",
    "CANCELLED_BY_SELLER",
  ],
};

// Label overrides for Donation (UI only)
function labelFor(kind, role, code) {
  if (kind === "DONATION") {
    const map = {
      AWAITING_DONOR: "Awaiting Donor Response",
      SELLER_ACCEPTED: "Donor Accepted",
      DELIVERY_IN_PROGRESS: "Meetup In Progress",
      MEETUP_COMPLETED: "Meetup Completed",
      BUYER_CONFIRMED: "Recipient Received Item",
      CANCELLED_BY_SELLER: "Cancelled by Donor",
    };
    return map[code] || getStatusLabel(code);
  }
  return getStatusLabel(code);
}

export default function MyOrdersStatusFilter({
  role, // "buyer" | "seller"
  kind, // "BUY_SELL" | "DONATION"
  value = "ALL",
  onChange,
  className = "",
}) {
  const allowed = STATUSES_BY_KIND[kind] || STATUS_CODES;

  // As before: hide PAID_OUT for the buyer tab
  const options =
    role === "buyer" ? allowed.filter((c) => c !== "PAID_OUT") : allowed;

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-2 py-1.5 pr-6 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                   hover:border-gray-400 transition-colors appearance-none"
        style={{ backgroundImage: "none" }}
      >
        <option value="ALL">All</option>
        {options.map((code) => (
          <option key={code} value={code}>
            {labelFor(kind, role, code)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
