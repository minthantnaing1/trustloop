// app/admin/support/[id]/AdminSupportDetailsClient.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import BackButton from "@/components/BackButton";
import SupportChat from "@/components/SupportChat";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

function getInitials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 3);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
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

export default function AdminSupportDetailsClient({ id, initialTicket }) {
  const [ticket, setTicket] = useState(initialTicket || null);
  const router = useRouter();

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [overrideMode, setOverrideMode] = useState(false);
  const [draftStatus, setDraftStatus] = useState("OPEN");

  const reporterName = useMemo(() => {
    return ticket?.user?.name || ticket?.user?.email || "Unknown";
  }, [ticket]);

  const reporterInitials = useMemo(
    () => getInitials(reporterName),
    [reporterName],
  );

  const isClosed = useMemo(() => {
    const s = String(ticket?.status || "OPEN").toUpperCase();
    return s === "RESOLVED" || s === "REJECTED";
  }, [ticket]);

  const messages = useMemo(() => {
    const list = Array.isArray(ticket?.messages) ? ticket.messages : [];
    return [...list].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [ticket]);

  const canOverrideSave = useMemo(() => {
    if (!ticket) return false;
    if (!overrideMode) return false;
    return String(draftStatus) !== String(ticket.status || "OPEN");
  }, [ticket, overrideMode, draftStatus]);

  async function load() {
    const r = await fetch(`/api/admin/support/${id}`, { cache: "no-store" });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();

    setTicket(data);
    setDraftStatus(String(data?.status || "OPEN"));
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

        if (initialTicket) {
          setDraftStatus(String(initialTicket?.status || "OPEN"));
          return;
        }

        await load();
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load ticket");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialTicket]);

  async function patch(payload) {
    if (busy) return;
    try {
      setBusy(true);
      setErr("");

      const r = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) throw new Error(await r.text());
      const updated = await r.json();

      setTicket(updated);
      setDraftStatus(String(updated?.status || "OPEN"));

      router.refresh();
    } catch (e) {
      setErr(e?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function onSendMessage(payload) {
    const text =
      typeof payload === "string"
        ? String(payload || "").trim()
        : String(payload?.text || "").trim();

    const images = Array.isArray(payload?.images) ? payload.images : [];

    if (!text && images.length === 0) return;

    await patch({ text, images });
    await load();
  }

  async function onOverrideSave() {
    await patch({ status: draftStatus });
    setOverrideMode(false);
    await load();
  }

  function toggleEditStatus() {
    if (!overrideMode) setDraftStatus(String(ticket?.status || "OPEN"));
    setOverrideMode((v) => !v);
  }

  return (
    <main className="max-w-[1200px] mx-auto mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#325082]">Customer Support</h1>
        <div className="shrink-0">
          <BackButton text="Back to Previous" />
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-white border border-rose-200 text-rose-700 rounded-md p-3 text-sm shadow-sm">
          {String(err)}
        </div>
      )}
      {!ticket && !err && (
        <div className="text-slate-600 text-sm">Loading…</div>
      )}

      {ticket && (
        <section className="space-y-3">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white rounded-md shadow-md border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                        #
                        {String(ticket._id || "")
                          .slice(-6)
                          .toUpperCase()}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-600">
                        {String(ticket.category || "OTHER").replaceAll(
                          "_",
                          " ",
                        )}
                      </span>
                      <PriorityPill value={ticket.priority} />
                      <StatusPill value={ticket.status} />
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="text-[11px] text-slate-500">Reporter</div>
                      <div className="text-[12px] font-medium text-[#1f2f4c] max-w-[220px] line-clamp-1">
                        {ticket.user?.name || ticket.user?.email || "Unknown"}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                      {reporterInitials}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[16px] font-semibold text-[#1f2f4c]">
                  {ticket.subject || "Support Ticket"}
                </div>

                <div className="mt-2 text-[12.5px] text-slate-600 whitespace-pre-line">
                  {ticket.description || "—"}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-slate-500">
                  <span>Created: {formatDateTime(ticket.createdAt)}</span>
                  <span className="text-slate-300">•</span>
                  <span>
                    Updated:{" "}
                    {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white rounded-md shadow-md border border-slate-200 p-4">
                <div className="text-[15px] font-semibold text-[#1f2f4c]">
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
                    {ticket.transaction?._id ? (
                      <Link
                        className="underline text-[#325082] hover:text-[#22365a] underline-offset-2"
                        href={`/admin/transactions/${ticket.transaction._id}`}
                      >
                        View transaction
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4 order-1 lg:order-2">
              <div className="bg-white rounded-md shadow-md border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[15px] font-semibold text-[#1f2f4c]">
                    Handle Case
                  </div>

                  <ActionButton
                    text={overrideMode ? "Exit Edit" : "Edit Status"}
                    variant={overrideMode ? "outlineHover" : "primaryHover"}
                    disabled={busy}
                    onClick={toggleEditStatus}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="text-[11px] text-slate-500">Priority</div>
                  <PriorityPill value={ticket.priority} />
                  <div className="text-[11px] text-slate-500 ml-2">Status</div>
                  <StatusPill value={ticket.status} />
                </div>

                {overrideMode ? (
                  <>
                    <div className="mt-3">
                      <label className="text-sm font-medium text-[#1f2f4c]">
                        Change status
                      </label>
                      <select
                        className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>

                    <div className="mt-3">
                      <ActionButton
                        text={busy ? "Saving..." : "Save Status"}
                        variant="primaryHover"
                        disabled={busy || !canOverrideSave}
                        onClick={onOverrideSave}
                        className="w-full justify-center"
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-[12px] text-slate-500">
                    Use status to close the case when finished.
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 order-2 lg:order-1">
              <div className="bg-white rounded-md shadow-md border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-[#1f2f4c]">
                    Conversation
                  </div>
                  <div className="text-[12px] text-slate-400">
                    {messages.length ? `${messages.length} messages` : ""}
                  </div>
                </div>

                <div className="mt-3">
                  <SupportChat
                    messages={messages}
                    viewerRole="ADMIN"
                    requireAdminFirstReply={false}
                    ticketStatus={ticket?.status}
                    statusUpdatedBy={ticket?.statusUpdatedBy}
                    statusUpdatedAt={ticket?.statusUpdatedAt}
                    disabled={busy || isClosed || overrideMode}
                    placeholder={
                      isClosed
                        ? "This case is closed."
                        : "Write a message to the user…"
                    }
                    onSend={onSendMessage}
                  />
                </div>

                {isClosed && (
                  <div className="mt-2 text-[12px] text-slate-500">
                    Ticket is closed. Reopen by changing status.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
