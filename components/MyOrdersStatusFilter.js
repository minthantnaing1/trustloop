"use client";

import { STATUS_CODES, getStatusLabel } from "@/components/StatusPill";

/**
 * Only show statuses that matter per kind.
 * BUY_SELL: everything except AWAITING_DONOR, SELLER_ACCEPTED
 * DONATION: meetup-only flow + donor/recipient wording; no admin/buyer cancel; no payment steps.
 */
const STATUSES_BY_KIND = {
  BUY_SELL: STATUS_CODES.filter(
    (s) => !["AWAITING_DONOR", "SELLER_ACCEPTED"].includes(s),
  ),
  DONATION: [
    "AWAITING_DONOR",
    "SELLER_ACCEPTED",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "CANCELLED_BY_SELLER",
  ],
};

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
        className="w-full px-2 py-1.5 pr-6 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                    hover:border-gray-400 transition-colors appearance-none"
        style={{ backgroundImage: "none" }}
      >
        <option value="ALL">All</option>
        {options.map((code) => (
          <option key={code} value={code}>
            {getStatusLabel(code, kind)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500"
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
