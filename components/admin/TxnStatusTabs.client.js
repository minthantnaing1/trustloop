"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function TxnStatusTabs() {
  const sp = useSearchParams();
  const active = (sp.get("status") || "ALL").toUpperCase();

  const tab = (label, val) => (
    <Link
      href={`/admin/transactions${
        val && val !== "ALL" ? `?status=${val}` : ""
      }`}
      className={`px-4 py-1.5 rounded-md text-sm border ${
        active === (val || "ALL")
          ? "bg-[#325082] text-white border-[#325082]"
          : "bg-white text-[#325082] border-[#325082]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex gap-2 mb-4">
      {tab("All", "ALL")}
      {tab("Awaiting", "AWAITING_ADMIN_REVIEW")}
      {tab("Verified", "ESCROW_FUNDED")}
      {tab("Rejected", "REJECTED")}
      {tab("Cancelled", "CANCELLED")}
    </div>
  );
}
