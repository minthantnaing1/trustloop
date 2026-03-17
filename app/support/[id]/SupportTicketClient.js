// app/support/[id]/SupportTicketClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";
import BackButton from "@/components/BackButton";
import SupportChat from "@/components/SupportChat";

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

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
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

export default function SupportTicketClient({ id }) {
  const router = useRouter();

  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    const r = await fetch(`/api/support/${id}`, { cache: "no-store" });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    setTicket(data);
  }

  useEffect(() => {
    if (!id) {
      setErr("Invalid ticket id.");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setErr("");
        await load();
      } catch (e) {
        if (mounted) setErr(e.message || "Failed to load ticket");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const txnId = useMemo(() => {
    const t = ticket?.transaction?._id;
    return t ? String(t) : "";
  }, [ticket]);

  const title = useMemo(() => {
    if (!ticket) return "Support ticket";
    return categoryLabel(ticket.category) || ticket.subject || "Support ticket";
  }, [ticket]);

  const isClosed = useMemo(() => {
    const s = String(ticket?.status || "OPEN").toUpperCase();
    return s === "RESOLVED" || s === "REJECTED";
  }, [ticket]);

  const messages = useMemo(() => {
    const list = Array.isArray(ticket?.messages) ? ticket.messages : [];
    return [...list].sort((a, b) => new Date(a.at) - new Date(b.at));
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

  async function sendMessage(text) {
    const v = String(text || "").trim();
    if (!v || busy) return;

    try {
      setBusy(true);
      setErr("");

      const r = await fetch(`/api/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: v }),
      });

      if (!r.ok) throw new Error(await r.text());

      await load();
      router.refresh();
    } catch (e) {
      setErr(e.message || "Failed to send message");
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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#325082] leading-tight">
              Customer Support
              <span className="text-xl font-bold text-[#325082]">
                {" "}
                / Ticket
              </span>
            </h1>
          </div>

          <div className="shrink-0 pt-1">
            <BackButton text="Back to Previous" />
          </div>
        </div>

        {err && <p className="mb-3 text-sm text-red-600">{String(err)}</p>}
        {!ticket && !err && (
          <p className="text-slate-500 mt-2 text-sm">Loading…</p>
        )}

        {ticket && (
          <>
            <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[18px] font-semibold text-[#1f2f4c] leading-tight">
                    {title}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                    <StatusTag value={ticket.status} />
                    <PriorityTag value={ticket.priority} />

                    <span className="text-slate-500">
                      Ticket ID:
                      <span className="ml-1 font-mono text-[#325082]">
                        {(
                          String(ticket._id || "").slice(-6) || "—"
                        ).toUpperCase()}
                      </span>
                    </span>

                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      Created: {formatDateTime(ticket.createdAt)}
                    </span>

                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">
                      Updated:{" "}
                      {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  <ActionButton
                    text={busy ? "Deleting..." : "Delete"}
                    variant="dangerOutlineHover"
                    disabled={busy || !ticket}
                    onClick={() => setConfirmOpen(true)}
                  />
                </div>
              </div>

              <div className="mt-4 text-sm text-slate-800 whitespace-pre-line">
                {ticket.description || "—"}
              </div>
            </section>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5">
                <div className="text-[15px] font-semibold text-[#325082]">
                  Related Order
                </div>

                <div className="mt-3 text-sm text-slate-700 space-y-2">
                  <div>
                    <span className="text-slate-500">Product:</span>{" "}
                    <span className="font-semibold text-[#1f2f4c]">
                      {ticket.product?.title || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Buyer:</span>{" "}
                    <span className="font-medium">
                      {ticket.buyer?.name || ticket.buyer?.email || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Seller:</span>{" "}
                    <span className="font-medium">
                      {ticket.seller?.name || ticket.seller?.email || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500">Order:</span>{" "}
                    {txnId ? (
                      <Link
                        className="underline text-[#325082] hover:text-[#22365a] underline-offset-2"
                        href={`/my-orders/${txnId}`}
                      >
                        View Order Details
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </section>

              {/* ✅ Same place, now uses SupportChat */}
              <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-[#325082]">
                    Conversation
                  </div>
                  <div className="text-[12px] text-slate-400">
                    {messages.length ? `${messages.length} messages` : ""}
                  </div>
                </div>

                <div className="mt-3">
                  <SupportChat
                    messages={messages}
                    viewerRole="USER"
                    requireAdminFirstReply={true}
                    ticketStatus={ticket?.status}
                    statusUpdatedBy={ticket?.statusUpdatedBy}
                    statusUpdatedAt={ticket?.statusUpdatedAt}
                    disabled={busy || isClosed}
                    placeholder={
                      isClosed ? "This ticket is closed." : "Write a message…"
                    }
                    onSend={sendMessage}
                  />
                </div>

                {isClosed && (
                  <div className="mt-2 text-[12px] text-slate-500">
                    This ticket is closed. If you still have an issue, create a
                    new ticket.
                  </div>
                )}
              </section>
            </div>
          </>
        )}

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
