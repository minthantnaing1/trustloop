// app/notifications/NotificationsListClient.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function NotificationsListClient({ initialItems = [] }) {
  const [all, setAll] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const router = useRouter();

  // keep page in sync with panel without hard refresh
  useEffect(() => {
    const onUpdated = (e) => {
      const { id, op } = e?.detail || {};
      if (op === "markRead" && id) {
        setAll((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        );
      } else if (op === "markAllRead") {
        setAll((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    };
    window.addEventListener("notifications:updated", onUpdated);
    return () => window.removeEventListener("notifications:updated", onUpdated);
  }, []);

  const load = () => {
    setLoading(true);
    fetch("/api/notifications?limit=20", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setAll(Array.isArray(data?.items) ? data.items : []))
      .finally(() => setLoading(false));
  };

  const markRead = async (id, isUnread) => {
    if (isUnread) {
      window.dispatchEvent(
        new CustomEvent("notifications:updated", {
          detail: { delta: -1, id, op: "markRead" },
        }),
      );
    }
    setAll((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
    fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "markRead" }),
    }).catch(() => load());
  };

  const handleView = async (n, isUnread) => {
    await markRead(n._id, isUnread); // optimistic + PATCH
    window.dispatchEvent(new Event("overlay:show"));
    router.push(n.link); // navigate immediately
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!all.length) {
    return (
      <div className="border border-gray-300 bg-white p-10 text-center rounded-[6px] shadow-sm">
        <p className="text-sm text-slate-500">No notifications.</p>
      </div>
    );
  }

  return (
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

        const evs = Array.isArray(n?.events) ? n.events : [];
        const isOpen = !!expanded[n._id];

        // ✅ NEW: filter out the latest event from history (so time/title doesn't show twice)
        const latestAtMs = new Date(n.updatedAt || n.createdAt).getTime();
        const latestTitle = n.title || "Notification";
        const latestMsg = n.message || "";

        const sortedEvs = evs
          .slice()
          .sort((a, b) => new Date(b.at) - new Date(a.at));

        let removedLatest = false;
        const historyEvs = sortedEvs.filter((e) => {
          const sameTitle = (e.title || "") === latestTitle;
          const sameMsg = (e.message || "") === latestMsg;

          if (!removedLatest && sameTitle && sameMsg) {
            removedLatest = true;
            return false;
          }

          return true;
        });

        const meId = n?.recipient?._id || n?.recipient; // the user receiving this noti
        const buyerIsMe =
          meId &&
          String(n?.transaction?.buyer?._id || n?.transaction?.buyer) ===
            String(meId);
        const sellerIsMe =
          meId &&
          String(n?.transaction?.seller?._id || n?.transaction?.seller) ===
            String(meId);

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

            {/* Latest Title + message */}
            <div className="flex items-start justify-between gap-3">
              {/* Left column (grow to fill) */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#325082]">
                  {n.title || "Notification"}
                </div>
                {n.message && (
                  <div className="text-sm text-gray-700 mt-1">{n.message}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(n.updatedAt || n.createdAt).toLocaleString(
                    "en-GB",
                    {
                      timeZone: "Asia/Bangkok",
                      hour12: false,
                    },
                  )}
                </div>
              </div>

              {/* Right column: Unread pill */}
              {isUnread && (
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full shrink-0">
                  Unread
                </span>
              )}
            </div>

            {/* History toggle + right-aligned actions (full card width) */}
            <div className="mt-2 flex items-center justify-between">
              {/* Left: history toggle (only when there is history) */}
              <div>
                {historyEvs.length > 0 && (
                  <button
                    className="text-xs text-[#325082] underline"
                    onClick={() =>
                      setExpanded((m) => ({ ...m, [n._id]: !isOpen }))
                    }
                  >
                    {isOpen
                      ? "Hide history"
                      : `Show history (${historyEvs.length})`}
                  </button>
                )}
              </div>

              {/* Right: action buttons (always visible if applicable) */}
              <div className="flex items-center gap-2">
                {n.link && (
                  <ActionButton
                    text="View"
                    variant="primaryClick"
                    onClick={() => handleView(n, isUnread)}
                  />
                )}
                {isUnread && (
                  <ActionButton
                    text="Mark read"
                    variant="outlineClick"
                    onClick={() => markRead(n._id, isUnread)}
                  />
                )}
              </div>
            </div>

            {/* History (newest → oldest) */}
            {isOpen && (
              <div className="mt-3 border-t border-gray-300 pt-2">
                <ul className="divide-y divide-gray-200">
                  {historyEvs.map((e, idx) => (
                    <li
                      key={idx}
                      className="py-2 first:pt-0 text-sm text-gray-700"
                    >
                      <span className="font-medium">{e.title}</span>
                      {e.message ? ` — ${e.message}` : ""}
                      <span className="block text-xs text-gray-500">
                        {new Date(e.at).toLocaleString("en-GB", {
                          timeZone: "Asia/Bangkok",
                          hour12: false,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
