"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "Snoozed" }, // mapped
  { key: "CLOSED_BUCKET", label: "Closed" }, // RESOLVED + CLOSED
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
    return "";
  }
}

function getInitials(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function TicketCard({ t }) {
  const userName = t?.user?.name || t?.user?.email || "Unknown";
  const ticketId = (t?._id || "").slice(-6).toUpperCase();
  const category = t?.category || "OTHER";
  const priority = t?.priority || "MEDIUM";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
            Ticket ID: {ticketId}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
            {category}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              priority === "URGENT"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : priority === "HIGH"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {priority}
          </span>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
          {getInitials(userName)}
        </div>
      </div>

      <div className="mt-2 text-sm font-semibold text-slate-900 line-clamp-2">
        {t?.subject}
      </div>

      <div className="mt-1 text-sm text-slate-600 line-clamp-3">
        {t?.message}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>Created: {formatDateTime(t?.createdAt)}</span>
        </div>

        {/* optional link if you later make ticket detail page */}
        <span className="text-slate-400">View</span>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");

  async function fetchTickets() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load tickets");
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (e) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const normalized = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = [...tickets];

    // search
    if (normalized) {
      list = list.filter((t) => {
        const s =
          `${t?.subject || ""} ${t?.message || ""} ${t?.user?.name || ""} ${t?.user?.email || ""}`.toLowerCase();
        return s.includes(normalized);
      });
    }

    // sidebar tab filter
    if (activeTab === "OPEN") {
      list = list.filter((t) => t.status === "OPEN");
    } else if (activeTab === "IN_PROGRESS") {
      list = list.filter((t) => t.status === "IN_PROGRESS");
    } else if (activeTab === "CLOSED_BUCKET") {
      list = list.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");
    }

    return list;
  }, [tickets, activeTab, normalized]);

  const openTickets = useMemo(
    () => filtered.filter((t) => t.status === "OPEN"),
    [filtered],
  );
  const snoozedTickets = useMemo(
    () => filtered.filter((t) => t.status === "IN_PROGRESS"),
    [filtered],
  );
  const closedTickets = useMemo(
    () => filtered.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED"),
    [filtered],
  );

  // ---- Stats (minimal: only what we can compute reliably)
  const stats = useMemo(() => {
    const thisMonth = tickets.filter((t) => isThisMonth(new Date(t.createdAt)));
    const solvedThisMonth = thisMonth.filter(
      (t) => t.status === "RESOLVED" || t.status === "CLOSED",
    );

    const last7 = tickets.filter((t) => new Date(t.createdAt) >= daysAgo(7));

    return {
      issuesThisMonth: thisMonth.length,
      solvedThisMonth: solvedThisMonth.length,

      // We don’t track response time or satisfaction yet -> show N/A
      avgResponse: "N/A",
      satisfaction: "N/A",

      openInProject: tickets.filter((t) => t.status === "OPEN").length,
      recentCount: last7.length,
    };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Admin</div>
            <h1 className="text-2xl font-bold text-slate-900">Ticket Stats</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTickets}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
            >
              Refresh
            </button>

            <Link
              href="/admin"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Main layout */}
        <div className="mt-5 grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-900 mb-2">
                Tickets
              </div>

              <div className="space-y-1">
                {STATUS_TABS.map((t) => {
                  const isActive = activeTab === t.key;
                  const count =
                    t.key === "ALL"
                      ? tickets.length
                      : t.key === "OPEN"
                        ? tickets.filter((x) => x.status === "OPEN").length
                        : t.key === "IN_PROGRESS"
                          ? tickets.filter((x) => x.status === "IN_PROGRESS").length
                          : tickets.filter(
                              (x) => x.status === "RESOLVED" || x.status === "CLOSED",
                            ).length;

                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                        isActive
                          ? "bg-slate-900 text-white"
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
                  Need Help?
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Review tickets and reply to users.
                </div>
                <button
                  className="mt-3 w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  onClick={() => {
                    // later: route to a “new reply”/detail page
                    alert("Later we can add ticket detail + reply page here.");
                  }}
                >
                  Contact Support
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            {/* Stats row */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500">Number of issues</div>
                  <div className="text-[11px] text-slate-400">this month</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.issuesThisMonth}
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500">Issues Solved</div>
                  <div className="text-[11px] text-slate-400">this month</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.solvedThisMonth}
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500">Avg. Response Time</div>
                  <div className="text-[11px] text-slate-400">in the last 7 days</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.avgResponse}
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500">Client Satisfaction</div>
                  <div className="text-[11px] text-slate-400">in the last 7 days</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.satisfaction}
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500">Open Tickets</div>
                  <div className="text-[11px] text-slate-400">in this project</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {stats.openInProject}
                  </div>
                </div>
              </div>
            </div>

            {/* Search / actions */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for a ticket..."
                    className="w-full outline-none text-sm text-slate-800"
                  />
                </div>

                <button
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  onClick={() => setSearch("")}
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  onClick={() => alert("Assign-to can be added after we add agents/admin users.")}
                >
                  Assign to
                </button>

                <button
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold"
                  onClick={() => alert("See All = same list for now (we already show all).")}
                >
                  See All →
                </button>
              </div>
            </div>

            {/* Tickets board */}
            <div className="mt-4">
              {loading ? (
                <div className="text-slate-600">Loading tickets...</div>
              ) : err ? (
                <div className="text-rose-600">{err}</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Open */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
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

                  {/* Snoozed / In Progress */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold text-slate-900">
                        Snoozed
                      </div>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {snoozedTickets.length}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {snoozedTickets.map((t) => (
                        <TicketCard key={t._id} t={t} />
                      ))}
                      {snoozedTickets.length === 0 && (
                        <div className="text-sm text-slate-500">
                          No snoozed tickets.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Closed */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
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
