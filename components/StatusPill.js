// components/StatusPill.js
"use client";

// Central UI map for status label + Tailwind classes
const STATUS_META = {
  PENDING_UPLOAD: {
    label: "Pending Upload",
    bg: "bg-orange-100",
    fg: "text-orange-700",
  },
  AWAITING_ADMIN_REVIEW: {
    label: "Awaiting Review",
    bg: "bg-yellow-100",
    fg: "text-yellow-700",
  },
  ESCROW_FUNDED: {
    label: "Escrow Funded",
    bg: "bg-green-100",
    fg: "text-green-700",
  },
  SELLER_ACCEPTED: {
    label: "Seller Accepted",
    bg: "bg-blue-100",
    fg: "text-blue-700",
  },
  DELIVERY_IN_PROGRESS: {
    label: "Delivery in Progress",
    bg: "bg-indigo-100",
    fg: "text-indigo-700",
  },
  SELLER_DELIVERED: {
    label: "Seller Delivered",
    bg: "bg-purple-100",
    fg: "text-purple-700",
  },
  MEETUP_COMPLETED: {
    label: "Meetup Completed",
    bg: "bg-cyan-100",
    fg: "text-cyan-700",
  },
  BUYER_CONFIRMED: {
    label: "Buyer Confirmed",
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
  },
  PAID_OUT: { label: "Paid Out", bg: "bg-emerald-100", fg: "text-emerald-700" },

  CANCELLED_BY_BUYER: {
    label: "Cancelled by Buyer",
    bg: "bg-red-100",
    fg: "text-red-700",
  },
  CANCELLED_BY_SELLER: {
    label: "Cancelled by Seller",
    bg: "bg-red-100",
    fg: "text-red-700",
  },
  REJECTED_BY_ADMIN: {
    label: "Rejected by Admin",
    bg: "bg-red-100",
    fg: "text-red-700",
  },
};

export const STATUS_CODES = Object.keys(STATUS_META); // keeps insertion order

export function getStatusLabel(s) {
  return STATUS_META[s]?.label || s || "-";
}
export function getStatusClasses(s) {
  const m = STATUS_META[s];
  return m ? `${m.bg} ${m.fg}` : "bg-gray-100 text-gray-700";
}

export default function StatusPill({ status, className = "", size = "sm" }) {
  const sizeCls =
    size === "sm"
      ? "text-[11px] px-2 py-1"
      : size === "md"
      ? "text-xs px-3 py-1.5"
      : "text-sm px-3 py-2";

  return (
    <span
      className={`rounded-full whitespace-nowrap font-medium ${sizeCls} ${getStatusClasses(
        status
      )} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
