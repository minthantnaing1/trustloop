"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";

function priorityForCategory(cat) {
  const map = {
    PAYMENT_ISSUE: "URGENT",
    WRONG_ITEM: "HIGH",
    SELLER_NO_SHOW: "HIGH",
    BUYER_NO_SHOW: "MEDIUM",
    DELIVERY_DELAY: "MEDIUM",
    OTHER: "LOW",
  };
  return map[cat] || "MEDIUM";
}

function categoryLabel(cat) {
  const map = {
    SELLER_NO_SHOW: "Seller no-show / not responding",
    BUYER_NO_SHOW: "Buyer no-show",
    DELIVERY_DELAY: "Delivery delay",
    WRONG_ITEM: "Wrong / damaged item",
    PAYMENT_ISSUE: "Payment issue",
    OTHER: "Other",
  };
  return map[cat] || "Support ticket";
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

function formatDT(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "-";
  }
}

function getLatestAdminReply(t) {
  const msgs = Array.isArray(t?.messages) ? t.messages : [];
  const admins = msgs
    .filter(
      (m) =>
        String(m?.role || "").toUpperCase() === "ADMIN" &&
        String(m?.text || "").trim(),
    )
    .sort((a, b) => new Date(a?.at) - new Date(b?.at));
  return admins.length ? admins[admins.length - 1] : null;
}

function RecentTicketCard({ t, onAskDelete }) {
  const router = useRouter();

  const tid = t._id?.toString?.() || t._id;
  const title = categoryLabel(t.category);
  const hasProduct = !!t.product?.title;

  const latestAdmin = useMemo(() => getLatestAdminReply(t), [t]);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open support ticket ${title}`}
      onClick={() => router.push(`/support/${tid}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          router.push(`/support/${tid}`);
        }
      }}
      className="relative bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-4
                 transition-all hover:shadow-md hover:ring-[#325082]/30
                 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#325082]/40"
    >
      <div className="flex items-start justify-between gap-4">
        {/* LEFT */}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[#1f2f4c] line-clamp-1">
            {title}
          </div>

          <div className="mt-1 text-[12.5px] text-slate-600 line-clamp-2">
            {t.description || "-"}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusTag value={t.status} />
            <PriorityTag
              value={t.priority || priorityForCategory(t.category)}
            />
            <span className="text-[12px] text-slate-500">
              Updated: {formatDT(t.updatedAt || t.createdAt)}
            </span>
          </div>

          <div className="mt-2 text-[12px] text-slate-500">
            {hasProduct ? (
              <>
                Product:{" "}
                <span className="font-medium text-[#1f2f4c]">
                  {t.product.title}
                </span>
              </>
            ) : (
              "General report (no order attached)"
            )}
          </div>
        </div>

        {/* RIGHT (fills whitespace) */}
        <div className="shrink-0 w-[260px] hidden sm:block">
          {/* Delete button top-right */}
          <div className="flex justify-end">
            <div
              onClick={(e) => {
                e.stopPropagation(); // ✅ stops card navigation
                onAskDelete(t);
              }}
            >
              <ActionButton text="Delete" variant="dangerOutlineHover" />
            </div>
          </div>

          {/* Latest admin reply */}
          {latestAdmin ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">
                Latest admin reply · {formatDT(latestAdmin.at)}
              </div>
              <div className="mt-1 text-[12.5px] text-slate-700 line-clamp-3 whitespace-pre-line">
                {latestAdmin.text}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[12px] text-slate-400 text-right">
              No admin reply yet
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SupportHomePage() {
  const [mine, setMine] = useState(null);
  const [err, setErr] = useState("");

  // delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyDelete, setBusyDelete] = useState(false);

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
        desc: "Seller is late, didn't come to meetup, or stopped replying.",
        category: "SELLER_NO_SHOW",
      },
      {
        title: "Delivery delay",
        desc: "Item hasn't arrived in expected timeframe or no delivery proof.",
        category: "DELIVERY_DELAY",
      },
      {
        title: "Wrong / damaged item",
        desc: "Item received does not match listing, missing parts, or damaged.",
        category: "WRONG_ITEM",
      },
      {
        title: "Payment issue",
        desc: "Payment slip, confirmation, or transaction status problem.",
        category: "PAYMENT_ISSUE",
      },
    ],
    [],
  );

  function onAskDelete(ticket) {
    setDeleteTarget(ticket);
    setConfirmOpen(true);
  }

  async function doDelete() {
    if (!deleteTarget || busyDelete) return;
    const id = deleteTarget._id?.toString?.() || deleteTarget._id;

    try {
      setBusyDelete(true);
      setErr("");

      const r = await fetch(`/api/support/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());

      // remove from UI immediately
      setMine((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.filter((x) => String(x._id) !== String(id));
      });
    } catch (e) {
      setErr(e?.message || "Failed to delete ticket");
    } finally {
      setBusyDelete(false);
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
                <PriorityTag value={priorityForCategory(p.category)} />
              </div>

              <p className="text-[12.5px] text-slate-600 mt-2 leading-snug">
                {p.desc}
              </p>

              <div className="mt-3">
                <Link
                  href={`/support/new?category=${encodeURIComponent(p.category)}`}
                  className="text-sm underline text-[#325082] hover:text-[#22365a] underline-offset-2"
                >
                  Report this issue
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
            <div className="mt-3 space-y-3">
              {mine.map((t) => (
                <RecentTicketCard
                  key={t._id?.toString?.() || t._id}
                  t={t}
                  onAskDelete={onAskDelete}
                />
              ))}

              {mine.length === 0 && (
                <div className="border border-gray-300 shadow-sm bg-white p-10 text-center rounded-[6px]">
                  <div className="text-lg font-medium text-[#1f2d4d] mb-1">
                    No reports yet
                  </div>
                  <p className="text-sm text-slate-500">
                    If something goes wrong, report it here and we'll help.
                  </p>
                  <div className="mt-4">
                    <Link href="/support/new">
                      <ActionButton
                        text="Create a report"
                        variant="primaryHover"
                        className="inline-flex items-center"
                      />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <ConfirmModal
          isOpen={confirmOpen}
          message="Delete this support ticket? This cannot be undone."
          variant="danger"
          onCancel={() => {
            if (busyDelete) return;
            setConfirmOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={async () => {
            await doDelete();
            setConfirmOpen(false);
            setDeleteTarget(null);
          }}
        />
      </main>
    </>
  );
}
