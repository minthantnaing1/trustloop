// app/admin/support/AdminSupportClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

function getInitials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 3);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function isThisMonth(d) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function PriorityPill({ value }) {
  const v = String(value || "MEDIUM").toUpperCase();
  const tone =
    v === "URGENT"
      ? "ring-red-200/70 bg-red-50/70 text-red-700"
      : v === "HIGH"
        ? "ring-amber-200/70 bg-amber-50/70 text-amber-700"
        : v === "LOW"
          ? "ring-slate-200/70 bg-slate-50/70 text-slate-600"
          : "ring-sky-200/70 bg-sky-50/70 text-sky-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold ring-1 rounded-full ${tone}`}
    >
      {v}
    </span>
  );
}

function StatusPill({ value }) {
  const v = String(value || "OPEN").toUpperCase();
  const tone =
    v === "RESOLVED"
      ? "ring-emerald-200/70 bg-emerald-50/70 text-emerald-700"
      : v === "IN_PROGRESS"
        ? "ring-indigo-200/70 bg-indigo-50/70 text-indigo-700"
        : v === "REJECTED"
          ? "ring-rose-200/70 bg-rose-50/70 text-rose-700"
          : "ring-slate-200/70 bg-slate-50/70 text-slate-600";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold ring-1 rounded-full ${tone}`}
    >
      {v.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({ label, sub, value }) {
  return (
    <div className="bg-white rounded-md shadow-md border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
      <div className="mt-2 text-2xl font-bold text-[#1f2f4c]">{value}</div>
    </div>
  );
}

/**
 * Desktop:
 *  - click selects summary only (no route change)
 * Mobile:
 *  - click navigates to ticket page (because summary is hidden on mobile)
 */
function TicketRowCard({ t, isActive, isDesktop, onSelect }) {
  const router = useRouter();

  const id = t?._id?.toString?.() || t?._id || "";
  const ticketId = String(id).slice(-6).toUpperCase();
  const userName = t?.user?.name || t?.user?.email || "Unknown";
  const initials = getInitials(userName);

  const subject = t?.subject || "Support Ticket";
  const desc = t?.description || "—";
  const category = String(t?.category || "OTHER").replaceAll("_", " ");
  const productTitle = t?.product?.title || "";
  const updated = t?.updatedAt || t?.createdAt;

  const handleClick = () => {
    if (isDesktop) onSelect?.(id);
    else router.push(`/admin/support/${id}`);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`block bg-white rounded-md shadow-md border p-4 transition-all cursor-pointer
        ${isActive ? "border-[#325082] ring-1 ring-[#325082]/20" : "border-slate-200 hover:shadow-lg"}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
              #{ticketId}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
              {category}
            </span>
            <PriorityPill value={t?.priority} />
            <StatusPill value={t?.status} />
          </div>

          <div className="mt-2 text-[15px] font-semibold text-[#1f2f4c] line-clamp-1">
            {subject}
          </div>

          <div className="mt-1 text-[12.5px] text-slate-600 line-clamp-2 whitespace-pre-line">
            {desc}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
            <span>Updated: {formatDateTime(updated)}</span>
            {productTitle ? (
              <span>
                Product:{" "}
                <span className="font-medium text-[#1f2f4c]">
                  {productTitle}
                </span>
              </span>
            ) : (
              <span>General report</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-[11px] text-slate-500">Reporter</div>
            <div className="text-[12px] font-medium text-[#1f2f4c] line-clamp-1 max-w-[160px]">
              {userName}
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
            {initials}
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onRefresh }) {
  return (
    <div className="bg-white rounded-md shadow-md border border-slate-200 p-10 text-center">
      <div className="text-lg font-semibold text-[#1f2f4c]">
        No tickets found
      </div>
      <p className="text-sm text-slate-500 mt-1">
        Try clearing filters or refresh the data.
      </p>
      <div className="mt-4 flex justify-center">
        <ActionButton
          text="Refresh"
          variant="outlineHover"
          onClick={onRefresh}
        />
      </div>
    </div>
  );
}

export default function AdminSupportClient({ initialTickets }) {
  const [tickets, setTickets] = useState(
    Array.isArray(initialTickets) ? initialTickets : [],
  );
  const [err, setErr] = useState("");

  // Search (apply on Enter / Search click)
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");

  // Filters
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");

  // Right preview panel (desktop)
  const [selectedId, setSelectedId] = useState(
    (Array.isArray(initialTickets) && initialTickets[0]?._id?.toString?.()) ||
      (Array.isArray(initialTickets) && initialTickets[0]?._id) ||
      "",
  );

  // Desktop detection (lg+)
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  async function fetchTickets() {
    setErr("");
    try {
      const r = await fetch("/api/admin/support", { cache: "no-store" });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `Request failed (${r.status})`);
      }
      const data = await r.json();
      const list = Array.isArray(data) ? data : [];

      if (!selectedId && list[0]?._id) {
        setSelectedId(list[0]._id?.toString?.() || list[0]._id);
      }

      setTickets(list);
    } catch (e) {
      setErr(e?.message || "Failed to load tickets");
      setTickets([]);
    }
  }

  const stats = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];

    const thisMonth = list.filter((t) => {
      const d = new Date(t.createdAt || t.updatedAt);
      return !Number.isNaN(d.getTime()) && isThisMonth(d);
    });

    const last7 = list.filter(
      (t) => new Date(t.createdAt || t.updatedAt) >= daysAgo(7),
    );

    const openAll = list.filter((t) => t.status === "OPEN").length;
    const inProgressAll = list.filter((t) => t.status === "IN_PROGRESS").length;
    const closedAll = list.filter(
      (t) => t.status === "RESOLVED" || t.status === "REJECTED",
    ).length;

    const highUrgentAll = list.filter(
      (t) => t.priority === "HIGH" || t.priority === "URGENT",
    ).length;

    return {
      recentCount: last7.length,
      openAll,
      inProgressAll,
      closedAll,
      highUrgentAll,
      issuesThisMonth: thisMonth.length,
    };
  }, [tickets]);

  const filtered = useMemo(() => {
    const list = Array.isArray(tickets) ? [...tickets] : [];
    const qq = String(q || "")
      .trim()
      .toLowerCase();

    let out = list;

    if (qq) {
      out = out.filter((t) => {
        const blob =
          `${t?.subject || ""} ${t?.description || ""} ${t?.user?.name || ""} ${
            t?.product?.title || ""
          }`.toLowerCase();
        return blob.includes(qq);
      });
    }

    if (status !== "ALL") {
      if (status === "CLOSED") {
        out = out.filter(
          (t) => t.status === "RESOLVED" || t.status === "REJECTED",
        );
      } else {
        out = out.filter((t) => String(t.status) === status);
      }
    }

    if (priority !== "ALL") {
      out = out.filter((t) => String(t.priority) === priority);
    }

    out.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    );

    return out;
  }, [tickets, q, status, priority]);

  const selectedTicket = useMemo(() => {
    const list = Array.isArray(filtered) ? filtered : [];
    const hit = list.find((t) => (t._id?.toString?.() || t._id) === selectedId);
    return hit || list[0] || null;
  }, [filtered, selectedId]);

  // Keep selection valid when filters change (desktop)
  useEffect(() => {
    if (!isDesktop) return;
    if (!filtered.length) return;

    const exists = filtered.some(
      (t) => (t._id?.toString?.() || t._id) === selectedId,
    );
    if (!exists) {
      const first = filtered[0]._id?.toString?.() || filtered[0]._id;
      setSelectedId(first);
    }
  }, [filtered, selectedId, isDesktop]);

  return (
    <main className="max-w-[1200px] mx-auto mb-6">
      <h1 className="text-2xl font-bold text-[#325082] mb-3">
        Customer Support
      </h1>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <StatCard
          label="Recent tickets"
          sub="last 7 days"
          value={stats.recentCount}
        />
        <StatCard label="Open" sub="all time" value={stats.openAll} />
        <StatCard
          label="In progress"
          sub="all time"
          value={stats.inProgressAll}
        />
        <StatCard label="Closed" sub="all time" value={stats.closedAll} />
        <StatCard
          label="High / Urgent"
          sub="all time"
          value={stats.highUrgentAll}
        />
      </section>

      <section className="sticky -top-10 z-40 pb-3">
        <div className="bg-white rounded-md shadow-md border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px] bg-white">
                <input
                  className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
                  placeholder="Search tickets (subject, user, product)..."
                  value={qDraft}
                  autoComplete="off"
                  onChange={(e) => setQDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setQ(qDraft);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQ(qDraft)}
                  className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-90 text-sm"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Status:</span>
                <select
                  className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Priority:</span>
                <select
                  className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex items-center gap-2 justify-between sm:justify-start">
                <ActionButton
                  text="Clear"
                  variant="outlineHover"
                  onClick={() => {
                    setQDraft("");
                    setQ("");
                    setStatus("ALL");
                    setPriority("ALL");
                  }}
                />
                <div className="text-sm text-slate-500">
                  Showing <b>{filtered.length}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {err && (
        <div className="mb-4 bg-white border border-rose-200 text-rose-700 rounded-md p-3 text-sm shadow-sm">
          {String(err)}
        </div>
      )}

      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          {filtered.length === 0 ? (
            <EmptyState onRefresh={fetchTickets} />
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const id = t._id?.toString?.() || t._id;
                const activeId =
                  selectedTicket?._id?.toString?.() || selectedTicket?._id;

                return (
                  <div key={id}>
                    <TicketRowCard
                      t={t}
                      isDesktop={isDesktop}
                      isActive={id === activeId}
                      onSelect={(tid) => setSelectedId(tid)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="hidden lg:block col-span-4">
          <div
            className="bg-white rounded-md shadow-md border border-slate-200 p-4 sticky"
            style={{ top: "48px" }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold text-[#1f2f4c]">
                Quick Summary
              </div>
            </div>

            {!selectedTicket ? (
              <div className="mt-3 text-sm text-slate-500">
                Select a ticket to preview.
              </div>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill value={selectedTicket.status} />
                  <PriorityPill value={selectedTicket.priority} />
                </div>

                <div className="mt-3 text-sm font-semibold text-[#1f2f4c]">
                  {selectedTicket.subject || "Support Ticket"}
                </div>

                <div className="mt-2 text-[12.5px] text-slate-600 whitespace-pre-line line-clamp-6">
                  {selectedTicket.description || "—"}
                </div>

                <div className="mt-3 space-y-2 text-[12px] text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Ticket ID</span>
                    <span className="font-mono text-[#325082]">
                      {String(selectedTicket._id || "")
                        .slice(-6)
                        .toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Reporter</span>
                    <span className="text-right">
                      {selectedTicket.user?.name ||
                        selectedTicket.user?.email ||
                        "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Updated</span>
                    <span className="text-right">
                      {formatDateTime(
                        selectedTicket.updatedAt || selectedTicket.createdAt,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Product</span>
                    <span className="text-right">
                      {selectedTicket.product?.title || "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/admin/support/${selectedTicket._id?.toString?.() || selectedTicket._id}`}
                  >
                    <ActionButton
                      text="View ticket details"
                      variant="primaryHover"
                      className="w-full justify-center"
                    />
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
