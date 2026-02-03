// app/support/[id]/SupportTicketClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";

function PriorityTag({ value }) {
  const v = String(value || "MEDIUM").toUpperCase();
  const tone =
    v === "URGENT"
      ? "ring-red-200/70 bg-red-50/70 text-red-700"
      : v === "HIGH"
        ? "ring-amber-200/70 bg-amber-50/70 text-amber-700"
        : v === "LOW"
          ? "ring-slate-200/70 bg-slate-50/70 text-slate-600"
          : "ring-sky-200/70 bg-sky-50/70 text-sky-700"; // MEDIUM
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

export default function SupportTicketClient({ id }) {
  const router = useRouter();

  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setErr("Invalid ticket id.");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setErr("");
        const r = await fetch(`/api/support/${id}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (mounted) setTicket(data);
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load ticket");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const txnId = useMemo(() => {
    const t = ticket?.transaction?._id;
    return t ? String(t) : "";
  }, [ticket]);

  async function doDelete() {
    if (!id || busy) return;

    try {
      setBusy(true);
      setErr("");

      const r = await fetch(`/api/support/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());

      router.push("/support");
      router.refresh();
    } catch (e) {
      setErr(e.message || "Failed to delete ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <main
        className="max-w-[1200px] mx-auto px-3 mb-6 transition-all duration-[800ms]"
        style={{ animation: "fadeSlide 800ms ease-out" }}
      >
        {/* ✅ Title row (consistent) */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#325082]">
              Customer Support
            </h1>
            <div className="text-sm text-slate-500">/ Ticket</div>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              text={busy ? "Deleting..." : "Delete"}
              variant="dangerOutlineHover"
              disabled={busy || !ticket}
              onClick={() => setConfirmOpen(true)}
            />
            <Link href="/support">
              <ActionButton text="Back" variant="outlineClick" />
            </Link>
          </div>
        </div>

        {err && <p className="mb-3 text-sm text-red-600">{String(err)}</p>}

        {!ticket && !err && (
          <p className="text-slate-500 mt-2 text-sm">Loading…</p>
        )}

        {ticket && (
          <>
            {/* ✅ Ticket info card */}
            <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5 mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[16px] font-semibold text-[#1f2f4c]">
                    {ticket.subject || "Support Ticket"}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-medium">
                      {String(ticket.category || "—").replaceAll("_", " ")}
                    </span>

                    <span className="mx-1 text-slate-300">•</span>

                    <span className="text-slate-500">Priority:</span>
                    <PriorityTag value={ticket.priority} />

                    <span className="mx-1 text-slate-300">•</span>

                    <span className="text-slate-500">Status:</span>
                    <StatusTag value={ticket.status} />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-800 whitespace-pre-line">
                {ticket.description || "—"}
              </div>

              {/* ✅ Context (product + order) */}
              <div className="mt-4 border-t pt-4 text-sm text-slate-700">
                <div>
                  Product:{" "}
                  <span className="font-medium">
                    {ticket.product?.title || "—"}
                  </span>
                </div>

                <div className="mt-1">
                  Order:{" "}
                  {txnId ? (
                    <Link
                      className="underline text-[#325082] hover:text-[#22365a] underline-offset-2"
                      href={`/my-orders/${txnId}`}
                    >
                      View Order
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ✅ Confirm delete */}
        <ConfirmModal
          isOpen={confirmOpen}
          message="Delete this support ticket? This cannot be undone."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            doDelete();
          }}
          variant="danger"
        />
      </main>
    </>
  );
}
