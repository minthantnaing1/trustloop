"use client";

import { useMemo, useState } from "react";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

function displayName(by, fallback) {
  if (!by) return fallback || "Unknown";
  if (typeof by === "string") return fallback || "Unknown";
  return by?.name || by?.email || fallback || "Unknown";
}

function closedMessage(status) {
  const s = String(status || "").toUpperCase();
  if (s === "RESOLVED") return "This ticket has been resolved.";
  if (s === "REJECTED") return "This ticket has been closed (rejected).";
  return "This ticket is closed.";
}

export default function SupportChat({
  messages = [],
  onSend,
  disabled,
  placeholder = "Write a message…",

  // ✅ viewer role so alignment works on both pages
  viewerRole = "USER", // "USER" | "ADMIN"

  // ✅ block user from sending first message (admin must reply first)
  requireAdminFirstReply = false,

  // ✅ optional (Closed by ...)
  ticketStatus,
  statusUpdatedBy,
  statusUpdatedAt,

  // ✅ NEW: control scroll height (optional)
  maxHeightClass = "lg:max-h-[360px] max-h-[300px]",
}) {
  const [draft, setDraft] = useState("");
  const [warn, setWarn] = useState("");

  const sorted = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    return [...list].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [messages]);

  const hasAdminReply = useMemo(() => {
    return sorted.some((m) => String(m?.role || "").toUpperCase() === "ADMIN");
  }, [sorted]);

  const isClosed = useMemo(() => {
    const s = String(ticketStatus || "").toUpperCase();
    return s === "RESOLVED" || s === "REJECTED";
  }, [ticketStatus]);

  const blockedByAdminFirst =
    requireAdminFirstReply && viewerRole === "USER" && !hasAdminReply;

  const finalDisabled = !!disabled || isClosed || blockedByAdminFirst;

  // ✅ Align by viewer role:
  // - USER view: USER bubble right, ADMIN left
  // - ADMIN view: ADMIN bubble right, USER left
  function isRightSide(messageRole) {
    const r = String(messageRole || "").toUpperCase();
    if (viewerRole === "ADMIN") return r === "ADMIN";
    return r === "USER";
  }

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm flex flex-col">
      {/* ✅ Scrollable Messages */}
      <div className={`overflow-y-auto p-4 space-y-3 ${maxHeightClass}`}>
        {sorted.length ? (
          sorted.map((m, idx) => {
            const role = String(m?.role || "").toUpperCase(); // USER/ADMIN
            const right = isRightSide(role);
            const isAdmin = role === "ADMIN";

            // ✅ show both role + name (what you asked)
            const baseName =
              viewerRole === "ADMIN"
                ? displayName(m?.by, isAdmin ? "Admin" : "User")
                : displayName(m?.by, isAdmin ? "Admin" : "User");

            const whoLabel = `${isAdmin ? "Admin" : "User"}: ${baseName}`;

            return (
              <div
                key={(m?.at || "") + "-" + idx}
                className={`flex ${right ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-line border
                    ${
                      isAdmin
                        ? "bg-slate-100 border-slate-200"
                        : "bg-sky-50 border-sky-200"
                    }`}
                >
                  <div className="text-[11px] text-slate-500 mb-1">
                    <span className="font-medium text-slate-600">
                      {whoLabel}
                    </span>{" "}
                    · {formatDateTime(m?.at)}
                  </div>
                  <div className="text-slate-800">{m?.text}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-slate-500">No messages yet.</div>
        )}
      </div>

      {/* Composer */}
      {onSend && (
        <div className="border-t border-slate-200 p-3">
          {(warn || blockedByAdminFirst || isClosed) && (
            <div className="mb-2 text-[12px] rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
              {warn ||
                (isClosed
                  ? closedMessage(ticketStatus)
                  : "Please wait for admin reply first.")}
            </div>
          )}

          {/* optional closed by line */}
          {statusUpdatedBy && statusUpdatedAt && (
            <div className="mb-2 text-[12px] text-slate-500">
              Status updated by{" "}
              <span className="font-medium text-slate-700">
                {`Admin: ${displayName(statusUpdatedBy, "Admin")}`}
              </span>{" "}
              · {formatDateTime(statusUpdatedAt)}
            </div>
          )}

          <textarea
            rows={3}
            className="w-full border border-slate-200 rounded-md p-2 text-sm disabled:bg-slate-50"
            placeholder={placeholder}
            disabled={finalDisabled}
            value={draft}
            onChange={(e) => {
              setWarn("");
              setDraft(e.target.value);
            }}
          />

          <div className="mt-2 flex justify-end">
            <button
              className="px-4 py-1.5 text-sm rounded-md bg-[#325082] text-white disabled:opacity-50"
              disabled={finalDisabled || !String(draft).trim()}
              onClick={() => {
                const text = String(draft || "").trim();
                if (!text) return;

                if (blockedByAdminFirst) {
                  setWarn("Please wait for admin reply first.");
                  return;
                }

                onSend(text);
                setDraft("");
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
