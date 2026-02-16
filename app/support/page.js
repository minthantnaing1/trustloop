"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

export default function SupportPage() {
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [pagePath, setPagePath] = useState("");
  useEffect(() => {
    setPagePath(window.location.pathname);
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
