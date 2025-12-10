"use client";

// Base UI map (kind-agnostic styles)
const STATUS_META = {
  PENDING_PAYMENT: {
    label: "Pending Payment",
    bg: "bg-orange-100",
    fg: "text-orange-700",
  },
  ESCROW_FUNDED: {
    label: "Escrow Funded",
    bg: "bg-green-100",
    fg: "text-green-700",
  },
  AWAITING_DONOR: {
    label: "Awaiting Donor Response",
    bg: "bg-pink-100",
    fg: "text-pink-700",
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
    label: "Buyer Received Item",
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
  },
  PAID_OUT: {
    label: "Paid Out by Admin",
    bg: "bg-emerald-100",
    fg: "text-emerald-700",
  },

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

export const STATUS_CODES = Object.keys(STATUS_META);

// UI-only label overrides per kind
const DONATION_LABEL_OVERRIDES = {
  SELLER_ACCEPTED: "Donor Accepted",
  DELIVERY_IN_PROGRESS: "Meetup In Progress",
  BUYER_CONFIRMED: "Recipient Received Item",
  CANCELLED_BY_SELLER: "Cancelled by Donor",
  // AWAITING_DONOR already reads correctly
};

export function getStatusLabel(code, kind) {
  if (kind === "DONATION" && DONATION_LABEL_OVERRIDES[code]) {
    return DONATION_LABEL_OVERRIDES[code];
  }
  return STATUS_META[code]?.label || code || "-";
}

export function getStatusClasses(code) {
  const m = STATUS_META[code];
  return m ? `${m.bg} ${m.fg}` : "bg-gray-100 text-gray-700";
}

export default function StatusPill({
  status,
  kind,
  className = "",
  size = "sm",
}) {
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
      {getStatusLabel(status, kind)}
    </span>
  );
}
