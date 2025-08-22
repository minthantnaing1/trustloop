"use client";

import ActionButton from "@/components/ActionButton";
import StatusPill, {
  getStatusLabel,
  STATUS_CODES,
} from "@/components/StatusPill";

const OPTIONS = ["ALL", ...STATUS_CODES]; // single source of truth

export default function TxnToolbar({
  statusFilter,
  onChangeFilter,
  editMode,
  deleteMode,
  onToggleEdit,
  onToggleDelete,
  className = "",
}) {
  return (
    <div className={`w-full flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
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

      <div className="flex items-center gap-2">
        <ActionButton
          text="Edit"
          variant={editMode ? "primaryClick" : "outlineClick"}
          onClick={onToggleEdit}
          className="h-[36px] min-w-[90px]"
        />
        <ActionButton
          text="Delete"
          variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
          onClick={onToggleDelete}
          className="h-[36px] min-w-[90px]"
        />
      </div>
    </div>
  );
}
