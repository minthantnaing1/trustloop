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
        })
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
        })
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
          <ul className="space-y-3 mb-3">
            {items.map((n) => {
              const product = n?.meta?.productTitle || n?.product?.title || "-";
              const buyer =
                n?.meta?.buyerName ||
                n?.transaction?.buyer?.name ||
                n?.transaction?.buyer?.email ||
                "-";
              const seller =
                n?.meta?.sellerName ||
                n?.transaction?.seller?.name ||
                n?.transaction?.seller?.email ||
                "-";

              const isUnread = n?.isRead === false;
              const evs = Array.isArray(n?.events) ? n.events : [];
              const open = !!expanded[n._id];

              const meId = n?.recipient?._id || n?.recipient; // the user receiving this noti
              const buyerIsMe =
                meId &&
                String(n?.transaction?.buyer?._id || n?.transaction?.buyer) ===
                  String(meId);
              const sellerIsMe =
                meId &&
                String(
                  n?.transaction?.seller?._id || n?.transaction?.seller
                ) === String(meId);

              return (
                <li
                  key={n._id}
                  className="bg-white border border-gray-300 rounded-[5px] shadow-sm p-4"
                >
                  {/* Product/Buyer/Seller row */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wide text-[#325082]">
                      <span className="w-1/3">Product</span>
                      <span className="w-1/3 text-center">
                        Buyer{buyerIsMe ? " (Me)" : ""}
                      </span>
                      <span className="w-1/3 text-right">
                        Seller{sellerIsMe ? " (Me)" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-slate-800">
                      <span className="w-1/3 pr-2 whitespace-normal break-words">
                        {product}
                      </span>
                      <span className="w-1/3 px-2 text-center whitespace-normal break-words">
                        {buyer}
                      </span>
                      <span className="w-1/3 pl-2 text-right whitespace-normal break-words">
                        {seller}
                      </span>
                    </div>
                  </div>

                  {/* Latest snapshot */}
                  <div className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#325082]">
                          {n.title}
                        </div>
                        {n.message && (
                          <div className="text-gray-700 mt-1">{n.message}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(
                            n.updatedAt || n.createdAt
                          ).toLocaleString()}
                        </div>
                      </div>
                      {isUnread && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                          Unread
                        </span>
                      )}
                    </div>

                    {/* Toggle history + actions */}
                    <div className="flex justify-between">
                      {/* Left: toggle only when there are multiple events */}
                      <button
                        className={`mt-2 text-[12.5px] text-[#325082] underline ${
                          evs.length > 1 ? "" : "invisible"
                        }`}
                        onClick={() => toggleExpanded(n._id)}
                      >
                        {open ? "Hide history" : `Show history (${evs.length})`}
                      </button>

                      {/* Right: action buttons (always visible if applicable) */}
                      <div className="flex items-center justify-end gap-2 mt-3">
                        {n.link && (
                          <Link
                            href={n.link}
                            data-suppress-overlay="true"
                            onClick={() => markOneRead(n._id)}
                          >
                            <ActionButton text="View" variant="primaryClick" />
                          </Link>
                        )}
                        <ActionButton
                          text="Mark read"
                          variant="outlineClick"
                          onClick={() => markOneRead(n._id)}
                        />
                      </div>
                    </div>

                    {open && (
                      <div className="mt-3 border-t border-gray-300 pt-2">
                        <ul className="divide-y divide-gray-200">
                          {evs
                            .slice()
                            .sort((a, b) => new Date(b.at) - new Date(a.at))
                            .map((e, idx) => (
                              <li
                                key={idx}
                                className="py-2 first:pt-0 text-sm text-gray-700"
                              >
                                <span className="font-medium">{e.title}</span>
                                {e.message ? ` — ${e.message}` : ""}
                                <span className="block text-xs text-gray-500">
                                  {new Date(e.at).toLocaleString()}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
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
