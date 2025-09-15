"use client";

import { STATUS_CODES, getStatusLabel } from "@/components/StatusPill";

export default function MyOrdersStatusFilter({
  value = "ALL",
  onChange,
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                   focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                   hover:border-gray-400 transition-colors pr-5.5 appearance-none"
        style={{ backgroundImage: "none" }}
      >
        <option value="ALL">All</option>
        {STATUS_CODES.map((code) => (
          <option key={code} value={code}>
            {getStatusLabel(code)}
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
