"use client";

import ActionButton from "@/components/ActionButton";
import { getStatusLabel, STATUS_CODES } from "@/components/StatusPill";

const OPTIONS = ["ALL", ...STATUS_CODES];

export default function TxnToolbar({
  statusFilter,
  onChangeFilter,
  editMode,
  deleteMode,
  onToggleEdit,
  onToggleDelete,
  className = "",
  showFilter = true, // toggle status filter (transactions)
  showEdit = true, // toggle Edit button
  showDelete = true, // toggle Delete button
  leftSlot = null, // NEW: custom JSX on the left (e.g., search bar)
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-between">
        {/* Left area: either custom leftSlot or the status filter */}
        <div className="flex-1 min-w-0">
          {leftSlot ? (
            <div className="max-w-full">{leftSlot}</div>
          ) : (
            <div
              className={`flex items-center gap-3 ${
                showFilter ? "" : "invisible h-0 w-0 overflow-hidden"
              }`}
            >
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
                      {code === "ALL" ? "All" : getStatusLabel(code)}
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

        {/* Right: buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {showEdit && (
            <ActionButton
              text="Edit"
              variant={editMode ? "primaryClick" : "outlineClick"}
              onClick={onToggleEdit}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
          {showDelete && ( // 🔴 only show if allowed
            <ActionButton
              text="Delete"
              variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
              onClick={onToggleDelete}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        {/* Buttons row (top-right) */}
        <div className="flex justify-end gap-2">
          {showEdit && (
            <ActionButton
              text="Edit"
              variant={editMode ? "primaryClick" : "outlineClick"}
              onClick={onToggleEdit}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
          {showDelete && ( // 🔴 only show if allowed
            <ActionButton
              text="Delete"
              variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
              onClick={onToggleDelete}
              className="h-[32px] min-w-[70px] text-sm"
            />
          )}
        </div>

        {/* Below that, the left area (search/filter) */}
        {leftSlot ? (
          <div className="w-full">{leftSlot}</div>
        ) : (
          <div
            className={`flex items-center gap-3 ${showFilter ? "" : "hidden"}`}
          >
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="relative flex-1">
              <select
                value={statusFilter}
                onChange={(e) => onChangeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-[#325082] focus:border-[#325082]
                           hover:border-gray-400 transition-colors pr-9 appearance-none"
                style={{ backgroundImage: "none" }}
              >
                {OPTIONS.map((code) => (
                  <option key={code} value={code}>
                    {code === "ALL" ? "All" : getStatusLabel(code)}
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
    </div>
  );
}
