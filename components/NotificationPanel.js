"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import ActionButton from "@/components/ActionButton";

export default function NotificationPanel({ open, onClose, onUnreadChange }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState({});
  const toggleExpanded = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const load = useCallback(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications?unread=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setItems(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    load();
  }, [load]);

  const markOneRead = async (id) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    onUnreadChange?.(-1);
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "markRead" }),
      });
      window.dispatchEvent(
        new CustomEvent("notifications:updated", {
          detail: { delta: -1, id, op: "markRead" },
        }),
      );
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    const count = items.length;
    if (!count) return onClose?.();
    setItems([]);
    onUnreadChange?.(-count);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "markAllRead" }),
      });
      window.dispatchEvent(
        new CustomEvent("notifications:updated", {
          detail: { delta: -count, op: "markAllRead" },
        }),
      );
    } catch {
      load();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[10001] ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#2b446a]/5 to-[#325082]/5">
          <h3 className="text-lg font-semibold text-[#2b446a]">
            Unread Notifications
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 active:scale-95"
            aria-label="Close notifications"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-b border-gray-300 shadow-xs bg-white">
          <Link href="/notifications" onClick={onClose}>
            <ActionButton
              text="View All Notifications"
              variant="primaryClick"
            />
          </Link>
          <ActionButton
            text="Mark all as read"
            variant="outlineClick"
            onClick={markAllRead}
          />
        </div>

        <div className="overflow-y-auto h-[calc(100%-120px)] p-3">
          {loading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
          {!loading && items.length === 0 && (
            <div className="p-6 text-sm text-gray-500">
              No new notifications.
            </div>
          )}
          <ul className="space-y-1">
            {items.map((n) => {
              const isUnread = n?.isRead === false;

              return (
                <li
                  key={n._id}
                  className={`group relative flex gap-3 px-3 py-3 rounded-lg
    border border-gray-200 bg-white hover:bg-[#f5f8ff]
    ${isUnread ? "ring-1 ring-[#325082]/20" : ""}`}
                >
                  {/* Make whole card navigate to details (NOT mark as read) */}
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => {
                        // optional: close panel when going to detail
                        onClose?.();
                      }}
                      className="absolute inset-0 rounded-lg"
                      aria-label={`Open notification: ${n.title}`}
                    />
                  )}

                  {/* Unread dot */}
                  <div className="pt-1 relative z-10">
                    {isUnread && (
                      <span className="block w-2.5 h-2.5 rounded-full bg-[#325082]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#1f3b66] truncate">
                          {n.title}
                        </p>

                        {n.message && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {new Date(
                          n.updatedAt || n.createdAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-1 flex items-center gap-3">
                      {n.link && (
                        <Link
                          href={n.link}
                          data-suppress-overlay="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            // If you want: mark read when user explicitly clicks "View details"
                            markOneRead(n._id);
                            onClose?.();
                          }}
                          className="text-xs text-[#325082] hover:underline"
                        >
                          View details →
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault(); // prevents clicking underlying Link overlay
                            e.stopPropagation();
                            markOneRead(n._id);
                          }}
                          className="
            text-xs text-gray-400 hover:text-[#325082]
            opacity-0 group-hover:opacity-100
            transition-opacity
          "
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
