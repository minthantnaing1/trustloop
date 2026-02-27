// components/admin/TxnToolbar.js
"use client";

import ActionButton from "@/components/ActionButton";
import { getStatusLabel } from "@/components/StatusPill";

const STATUSES_BY_KIND = {
  BUY_SELL: [
    "PENDING_PAYMENT",
    "PAYMENT_SUCCESSFUL",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "PAID_OUT",
    "CANCELLED_BY_BUYER",
    "CANCELLED_BY_SELLER",
    "REJECTED_BY_ADMIN",
  ],
  DONATION: [
    "AWAITING_DONOR",
    "SELLER_ACCEPTED",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "CANCELLED_BY_SELLER",
  ],
  // ✅ AUCTION uses the same admin lifecycle as buy/sell (payout/refund)
  AUCTION: [
    "PENDING_PAYMENT",
    "PAYMENT_SUCCESSFUL",
    "DELIVERY_IN_PROGRESS",
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "PAID_OUT",
    "CANCELLED_BY_BUYER",
    "CANCELLED_BY_SELLER",
    "REJECTED_BY_ADMIN",
  ],
};

function KindSwitch({ kind, setKind, compact = false }) {
  const options = [
    { v: "BUY_SELL", label: "Buy/Sell" },
    { v: "DONATION", label: "Donation" },
    { v: "AUCTION", label: "Auction" },
  ];

  const activeIndex = options.findIndex((o) => o.v === kind);

  // desktop vs mobile sizes
  const wrapW = compact ? "w-[228px]" : "w-[270px]";
  const btnH = compact ? "h-8" : "h-9";
  const btnText = compact ? "text-xs" : "text-sm";
  const btnPad = compact ? "px-2" : "px-3";

  const colCls = "grid-cols-3";
  const knobW = "w-[calc(33.333%-0.25rem)]";

  const knobTranslate =
    activeIndex <= 0
      ? "translate-x-0"
      : activeIndex === 1
        ? "translate-x-full"
        : "translate-x-[200%]";

  return (
    <div
      className={`relative inline-grid ${colCls} rounded-full bg-slate-100 p-1 shadow-sm ${wrapW}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 ${knobW} rounded-full bg-[#325082]
                    transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                    transform-gpu will-change-transform
                    ${knobTranslate}`}
      />

      {options.map((o) => {
        const active = kind === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => setKind(o.v)}
            className={`relative z-10 ${btnH} ${btnPad} ${btnText} font-medium rounded-full
                        transition-colors duration-[800ms]
                        ${
                          active
                            ? "text-white"
                            : "text-[#325082] hover:text-[#22365a]"
                        }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TxnToolbar({
  statusFilter,
  onChangeFilter,
  kindFilter,
  onChangeKind,
  editMode,
  deleteMode,
  onToggleEdit,
  onToggleDelete,
  className = "",
  showFilter = true,
  showEdit = true,
  showDelete = true,
  leftSlot = null,
}) {
  const OPTIONS = ["ALL", ...(STATUSES_BY_KIND[kindFilter] || [])];

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {leftSlot ? (
            <div className="max-w-full">{leftSlot}</div>
          ) : (
            <div
              className={`flex items-center gap-3 ${
                showFilter ? "" : "invisible h-0 w-0 overflow-hidden"
              }`}
            >
              <div className="mr-2">
                <KindSwitch kind={kindFilter} setKind={onChangeKind} />
              </div>

              <span className="text-sm font-medium text-gray-700">Filter:</span>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => onChangeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                             hover:border-gray-400 transition-colors pr-9 appearance-none"
                  style={{ backgroundImage: "none" }}
                >
                  {OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code === "ALL"
                        ? "All"
                        : getStatusLabel(code, kindFilter)}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showEdit && (
            <ActionButton
              text={editMode ? "Exit Edit" : "Edit"}
              variant={editMode ? "primaryClick" : "outlineClick"}
              onClick={onToggleEdit}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
          {showDelete && (
            <ActionButton
              text="Delete"
              variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
              onClick={onToggleDelete}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        {leftSlot ? (
          <div className="w-full">{leftSlot}</div>
        ) : (
          <>
            <div
              className={`flex items-center gap-2 ${showFilter ? "" : "hidden"}`}
            >
              <KindSwitch kind={kindFilter} setKind={onChangeKind} compact />

              <div className="relative flex-1 min-w-0">
                <select
                  value={statusFilter}
                  onChange={(e) => onChangeFilter(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-300 bg-white text-xs shadow-sm
                             focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                             hover:border-gray-400 transition-colors pr-8 appearance-none"
                  style={{ backgroundImage: "none" }}
                >
                  {OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {code === "ALL"
                        ? "All"
                        : getStatusLabel(code, kindFilter)}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          {showEdit && (
            <ActionButton
              text="Edit"
              variant={editMode ? "primaryClick" : "outlineClick"}
              onClick={onToggleEdit}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
          {showDelete && (
            <ActionButton
              text="Delete"
              variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
              onClick={onToggleDelete}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
