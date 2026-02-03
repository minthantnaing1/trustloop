// app/admin/support/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "CLOSED_BUCKET", label: "Closed" }, // RESOLVED + REJECTED
];

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

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

function getInitials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function PriorityTag({ value }) {
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
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
    >
      {v}
    </span>
  );
}

function StatusTag({ value }) {
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
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
    >
      {v.replaceAll("_", " ")}
    </span>
  );
}

function TicketCard({ t }) {
  const id = t?._id?.toString?.() || t?._id || "";
  const ticketId = String(id).slice(-6).toUpperCase();
  const userName = t?.user?.name || t?.user?.email || "Unknown";
  const initials = getInitials(userName);

  const category = String(t?.category || "OTHER").replaceAll("_", " ");
  const subject = t?.subject || "Support Ticket";
  const desc = t?.description || "";
  const productTitle = t?.product?.title || "";
  const updated = t?.updatedAt || t?.createdAt;

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
            Ticket: {ticketId}
          </span>

          <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
            {category}
          </span>

          <PriorityTag value={t?.priority} />
          <StatusTag value={t?.status} />
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700 shrink-0">
          {initials}
        </div>
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">
        {subject}
      </div>

      {productTitle ? (
        <div className="mt-1 text-[12px] text-slate-600">
          Product:{" "}
          <span className="font-medium text-slate-800">{productTitle}</span>
        </div>
      ) : (
        <div className="mt-1 text-[12px] text-slate-500">General report</div>
      )}

      <div className="mt-2 text-sm text-slate-600 line-clamp-3 whitespace-pre-line">
        {desc}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Updated: {formatDateTime(updated)}</span>

        <Link
          href={`/admin/support/${id}`}
          className="text-[#325082] font-semibold underline underline-offset-2 hover:opacity-90"
        >
          View
        </Link>
      </div>
    </div>
  );
}

function StatCard({ labelTop, labelSub, value }) {
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="text-xs text-slate-500">{labelTop}</div>
      <div className="text-[11px] text-slate-400">{labelSub}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [tickets, setTickets] = useState(null);
  const [err, setErr] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  // keep your existing filters too (optional, but helpful)
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  async function fetchTickets() {
    setErr("");
    try {
      const r = await fetch("/api/admin/support", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load tickets");
      setTickets([]);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const normalized = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const list = Array.isArray(tickets) ? [...tickets] : [];

    // search
    let out = list;
    if (normalized) {
      out = out.filter((t) => {
        const blob =
          `${t?.subject || ""} ${t?.description || ""} ${t?.user?.name || ""} ${t?.user?.email || ""} ${t?.product?.title || ""}`.toLowerCase();
        return blob.includes(normalized);
      });
    }

    // sidebar tab filter
    if (activeTab === "OPEN") {
      out = out.filter((t) => String(t.status) === "OPEN");
    } else if (activeTab === "IN_PROGRESS") {
      out = out.filter((t) => String(t.status) === "IN_PROGRESS");
    } else if (activeTab === "CLOSED_BUCKET") {
      out = out.filter(
        (t) => t.status === "RESOLVED" || t.status === "REJECTED",
      );
    }

    // priority filter
    if (priorityFilter !== "ALL") {
      out = out.filter((t) => String(t.priority) === priorityFilter);
    }

    return out;
  }, [tickets, activeTab, normalized, priorityFilter]);

  const openTickets = useMemo(
    () => filtered.filter((t) => t.status === "OPEN"),
    [filtered],
  );
  const inProgressTickets = useMemo(
    () => filtered.filter((t) => t.status === "IN_PROGRESS"),
    [filtered],
  );
  const closedTickets = useMemo(
    () =>
      filtered.filter(
        (t) => t.status === "RESOLVED" || t.status === "REJECTED",
      ),
    [filtered],
  );

  const stats = useMemo(() => {
    const list = Array.isArray(tickets) ? tickets : [];

    const thisMonth = list.filter((t) => {
      const d = new Date(t.createdAt || t.updatedAt);
      return !Number.isNaN(d.getTime()) && isThisMonth(d);
    });

    const solvedThisMonth = thisMonth.filter(
      (t) => t.status === "RESOLVED" || t.status === "REJECTED",
    );

    const last7 = list.filter(
      (t) => new Date(t.createdAt || t.updatedAt) >= daysAgo(7),
    );

    return {
      issuesThisMonth: thisMonth.length,
      solvedThisMonth: solvedThisMonth.length,
      recentCount: last7.length,
      openAll: list.filter((t) => t.status === "OPEN").length,
      inProgressAll: list.filter((t) => t.status === "IN_PROGRESS").length,
    };
  }, [tickets]);

  const isLoading = tickets === null;

  const sidebarCount = (key) => {
    const list = Array.isArray(tickets) ? tickets : [];
    if (key === "ALL") return list.length;
    if (key === "OPEN") return list.filter((x) => x.status === "OPEN").length;
    if (key === "IN_PROGRESS")
      return list.filter((x) => x.status === "IN_PROGRESS").length;
    return list.filter(
      (x) => x.status === "RESOLVED" || x.status === "REJECTED",
    ).length;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TrustLoop padding/width like your pages */}
      <div className="max-w-[1200px] mx-auto px-3 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Admin</div>
            <h1 className="text-2xl font-bold text-[#325082]">
              Customer Support
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTickets}
              className="px-3 py-2 rounded-[8px] border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Main layout */}
        <div className="mt-5 grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-4 lg:col-span-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-sm font-semibold text-slate-900 mb-2">
                Tickets
              </div>

              <div className="space-y-1">
                {STATUS_TABS.map((t) => {
                  const isActive = activeTab === t.key;
                  const count = sidebarCount(t.key);

                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-sm transition-colors ${
                        isActive
                          ? "bg-[#325082] text-white"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span>{t.label}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-900">
                  Quick Filter
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Filter by priority.
                </div>

                <select
                  className="mt-3 w-full border border-slate-200 rounded-[10px] px-3 py-2 text-sm bg-white"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="ALL">All priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="col-span-12 md:col-span-8 lg:col-span-9">
            {/* Stats row */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard
                  labelTop="Number of issues"
                  labelSub="this month"
                  value={stats.issuesThisMonth}
                />
                <StatCard
                  labelTop="Issues solved"
                  labelSub="this month"
                  value={stats.solvedThisMonth}
                />
                <StatCard
                  labelTop="Recent tickets"
                  labelSub="last 7 days"
                  value={stats.recentCount}
                />
                <StatCard
                  labelTop="Open tickets"
                  labelSub="all"
                  value={stats.openAll}
                />
                <StatCard
                  labelTop="In progress"
                  labelSub="all"
                  value={stats.inProgressAll}
                />
              </div>
            </div>

            {/* Search / actions */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px] bg-white">
                  <input
                    className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
                    placeholder="Search tickets (subject, user, email, product)..."
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSearch(searchDraft);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setSearch(searchDraft)}
                    className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-90 text-sm"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-[8px] border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  onClick={() => {
                    setSearchDraft("");
                    setSearch("");
                  }}
                >
                  Clear
                </button>

                <div className="text-sm text-slate-500">
                  Showing <b>{filtered.length}</b>
                </div>
              </div>
            </div>

            {/* Errors / loading */}
            {err && (
              <div className="mt-4 bg-white border border-rose-200 text-rose-700 rounded-xl p-3 text-sm shadow-sm">
                {String(err)}
              </div>
            )}

            {/* Tickets board */}
            <div className="mt-4">
              {isLoading ? (
                <div className="text-slate-600">Loading tickets...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Open */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-slate-900">
                        Open
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {openTickets.length}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {openTickets.map((t) => (
                        <TicketCard key={t._id} t={t} />
                      ))}
                      {openTickets.length === 0 && (
                        <div className="text-sm text-slate-500">
                          No open tickets.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In progress */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-slate-900">
                        In progress
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {inProgressTickets.length}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {inProgressTickets.map((t) => (
                        <TicketCard key={t._id} t={t} />
                      ))}
                      {inProgressTickets.length === 0 && (
                        <div className="text-sm text-slate-500">
                          No in-progress tickets.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Closed */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-slate-900">
                        Closed
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {closedTickets.length}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {closedTickets.map((t) => (
                        <TicketCard key={t._id} t={t} />
                      ))}
                      {closedTickets.length === 0 && (
                        <div className="text-sm text-slate-500">
                          No closed tickets.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
