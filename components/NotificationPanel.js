// components/NotificationPanel.js
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import ActionButton from "@/components/ActionButton";

export default function NotificationPanel({ open, onClose, onUnreadChange }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
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
    const target = items.find((n) => n._id === id);
    if (!target || target.isRead) return;

    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );

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
    const unreadCount = items.filter((n) => n.isRead === false).length;
    if (!unreadCount) return onClose?.();

    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onUnreadChange?.(-unreadCount);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "markAllRead" }),
      });

      window.dispatchEvent(
        new CustomEvent("notifications:updated", {
          detail: { delta: -unreadCount, op: "markAllRead" },
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
            Notifications
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
              text="View Details Notifications"
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

          <ul className="space-y-2">
            {items.map((n) => {
              const isUnread = n?.isRead === false;

              return (
                <li
                  key={n._id}
                  className={`flex gap-3 px-3 py-2.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition ${
                    isUnread ? "bg-[#325082]/5 border-[#325082]/10" : ""
                  }`}
                >
                  {/* dot */}
                  <div className="mt-2 shrink-0">
                    <span
                      className={`block w-2 h-2 rounded-full ${
                        isUnread ? "bg-[#325082]" : "bg-gray-300"
                      }`}
                    />
                  </div>

                  {/* content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-[#1f3b66] truncate">
                        {n.title}
                      </p>

                      <span className="text-[11px] text-gray-400">
                        {new Date(
                          n.updatedAt || n.createdAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {n.message && (
                      <p className="text-[13px] text-gray-600 leading-snug mt-[2px]">
                        {n.message}
                      </p>
                    )}

                    <div className="flex justify-between mt-1">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={onClose}
                          className="text-[12px] text-[#325082] font-medium hover:underline"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-[12px] text-gray-400">
                          No details
                        </span>
                      )}

                      {isUnread ? (
                        <button
                          onClick={() => markOneRead(n._id)}
                          className="text-[12px] text-gray-400 hover:text-[#325082]"
                        >
                          Mark read
                        </button>
                      ) : (
                        <span className="text-[12px] text-gray-300">Read</span>
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
