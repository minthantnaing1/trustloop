"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";

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

export default function SupportHomePage() {
  const [mine, setMine] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    const r = await fetch("/api/support", { cache: "no-store" });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    setMine(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load support tickets");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const popular = useMemo(
    () => [
      {
        title: "Seller no-show / not responding",
        desc: "Seller is late, didn’t come to meetup, or stopped replying.",
        category: "SELLER_NO_SHOW",
        priority: "HIGH",
      },
      {
        title: "Delivery delay",
        desc: "Item hasn’t arrived in expected timeframe or no delivery proof.",
        category: "DELIVERY_DELAY",
        priority: "MEDIUM",
      },
      {
        title: "Wrong / damaged item",
        desc: "Item received does not match listing, missing parts, or damaged.",
        category: "WRONG_ITEM",
        priority: "HIGH",
      },
      {
        title: "Payment issue",
        desc: "Payment slip, confirmation, or transaction status problem.",
        category: "PAYMENT_ISSUE",
        priority: "MEDIUM",
      },
    ],
    [],
  );

  async function onDelete(ticketId) {
    const ok = window.confirm(
      "Delete this support ticket? This cannot be undone.",
    );
    if (!ok) return;

    try {
      setBusyId(ticketId);
      const r = await fetch(`/api/support/${ticketId}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <NavBar />

      <main className="max-w-[1200px] mx-auto px-3 mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#325082]">
            Customer Support
          </h1>

          <Link href="/support/new">
            <ActionButton text="Report a Problem" variant="primaryClick" />
          </Link>
        </div>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {popular.map((p) => (
            <article
              key={p.title}
              className="bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-md transition-all rounded-[6px] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-semibold text-[#325082] leading-tight">
                  {p.title}
                </div>
                <PriorityTag value={p.priority} />
              </div>

              <p className="text-[12.5px] text-slate-600 mt-2 leading-snug">
                {p.desc}
              </p>

              <div className="mt-3">
                <Link
                  href={`/support/new?category=${encodeURIComponent(p.category)}&priority=${encodeURIComponent(p.priority)}`}
                  className="text-sm underline text-[#325082] hover:text-[#22365a] underline-offset-2"
                >
                  Report this issue
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-[16px] font-semibold text-[#325082]">
              My Recent Reports
            </div>
            <span className="text-[12px] text-slate-500">
              For order-specific reports, use “Support” inside Order Details.
            </span>
          </div>

          {err && <p className="text-red-600 mt-2 text-sm">{String(err)}</p>}
          {!mine && !err && (
            <p className="text-slate-500 mt-2 text-sm">Loading…</p>
          )}

          {mine && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border-b font-medium">Subject</th>
                    <th className="p-2 border-b font-medium">Category</th>
                    <th className="p-2 border-b font-medium">Priority</th>
                    <th className="p-2 border-b font-medium">Status</th>
                    <th className="p-2 border-b font-medium">Updated</th>
                    <th className="p-2 border-b font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((t) => {
                    const tid = t._id?.toString?.() || t._id;
                    return (
                      <tr key={tid} className="hover:bg-gray-50">
                        <td className="p-2">
                          <div className="font-medium text-[#1f2f4c]">
                            {t.subject || "Support Ticket"}
                          </div>
                          {t.product?.title ? (
                            <div className="text-[12px] text-slate-500 mt-0.5">
                              Product:{" "}
                              <span className="font-medium">
                                {t.product.title}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[12px] text-slate-500 mt-0.5">
                              General report (no order attached)
                            </div>
                          )}
                        </td>

                        <td className="p-2">
                          {String(t.category || "-").replaceAll("_", " ")}
                        </td>

                        <td className="p-2">
                          <PriorityTag value={t.priority} />
                        </td>

                        <td className="p-2">
                          <StatusTag value={t.status} />
                        </td>

                        <td className="p-2">
                          {new Date(
                            t.updatedAt || t.createdAt,
                          ).toLocaleString()}
                        </td>

                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            {/* ✅ VIEW ticket page = /support/[id] */}
                            <Link
                              href={`/support/${tid}`}
                              className="text-sm underline text-[#325082] underline-offset-2"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={() => onDelete(tid)}
                              disabled={busyId === tid}
                              className="text-sm underline text-rose-700 underline-offset-2 disabled:opacity-50"
                            >
                              {busyId === tid ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {mine.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No reports yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
