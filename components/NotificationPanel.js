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
        new CustomEvent("notifications:updated", { detail: { delta: -1 } })
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
        new CustomEvent("notifications:updated", { detail: { delta: -count } })
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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#2b446a]/5 to-[#325082]/5">
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

        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <Link href="/notifications" onClick={onClose}>
            <ActionButton text="View all" variant="primaryClick" />
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

              return (
                <li
                  key={n._id}
                  className="bg-white border border-gray-300 rounded-[5px] shadow-sm p-4"
                >
                  {/* Product/Buyer/Seller row */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[11px] uppercase tracking-wide text-slate-500">
                      <span className="w-1/3">Product</span>
                      <span className="w-1/3 text-center">Buyer</span>
                      <span className="w-1/3 text-right">Seller</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-slate-800">
                      <span className="w-1/3 truncate">{product}</span>
                      <span className="w-1/3 text-center truncate">
                        {buyer}
                      </span>
                      <span className="w-1/3 text-right truncate">
                        {seller}
                      </span>
                    </div>
                  </div>

                  {/* Title + message */}
                  <div className="text-sm">
                    <div className="font-semibold text-[#325082]">
                      {n.title}
                    </div>
                    {n.message && (
                      <div className="text-gray-700 mt-1">{n.message}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-3">
                    {n.link && (
                      <Link href={n.link} onClick={() => markOneRead(n._id)}>
                        <ActionButton text="View" variant="primaryClick" />
                      </Link>
                    )}
                    <ActionButton
                      text="Mark read"
                      variant="outlineClick"
                      onClick={() => markOneRead(n._id)}
                    />
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
