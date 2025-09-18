"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";

export default function NotificationsPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAll(Array.isArray(data) ? data : data?.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id, isUnread) => {
    if (isUnread) {
      window.dispatchEvent(
        new CustomEvent("notifications:updated", { detail: { delta: -1 } })
      );
    }
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "markRead" }),
    });
    load();
  };

  return (
    // inside NotificationsPage render
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Notifications</h1>
          <BackButton />
        </div>

        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && all.length === 0 && (
          <div className="border border-gray-300 bg-white p-10 text-center rounded-[6px] shadow-sm">
            <p className="text-sm text-slate-500">No notifications.</p>
          </div>
        )}

        <ul className="space-y-3">
          {all.map((n) => {
            const isUnread = n?.isRead === false;
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
                    <span className="w-1/3 text-center truncate">{buyer}</span>
                    <span className="w-1/3 text-right truncate">{seller}</span>
                  </div>
                </div>

                {/* Title + message */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#325082]">
                      {n.title || "Notification"}
                    </div>
                    {n.message && (
                      <div className="text-sm text-gray-700 mt-1">
                        {n.message}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {isUnread && (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                      Unread
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3">
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => markRead(n._id, isUnread)}
                    >
                      <ActionButton text="View" variant="primaryClick" />
                    </Link>
                  )}
                  {isUnread && (
                    <ActionButton
                      text="Mark read"
                      variant="outlineClick"
                      onClick={() => markRead(n._id, isUnread)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
