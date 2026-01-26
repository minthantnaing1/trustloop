// components/TxnChat.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ActionButton from "@/components/ActionButton";

function safeIso(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
}

function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-[#e7ecf8] bg-white">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!text.trim()) return;
            onSend(text);
            setText("");
          }
        }}
        className="flex-1 rounded-[3px] border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#325082]"
      />
      <ActionButton
        text="Send"
        variant="primaryClick"
        disabled={disabled || !text.trim()}
        onClick={() => {
          if (!text.trim()) return;
          onSend(text);
          setText("");
        }}
      />
    </div>
  );
}

export default function TxnChat({
  txnId,
  meId,
  title = "Chat",
  onStatusChange,
}) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [lastAfter, setLastAfter] = useState(null);

  const boxRef = useRef(null);
  const stickRef = useRef(true);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const onScroll = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = gap < 120;
  }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${txnId}/chat?limit=60`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);

      const last = list.length ? list[list.length - 1] : null;
      setLastAfter(last?.createdAt ? safeIso(last.createdAt) : null);

      setTimeout(() => scrollToBottom(false), 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function pollNew() {
    if (!lastAfter) return;
    try {
      const res = await fetch(
        `/api/transactions/${txnId}/chat?after=${encodeURIComponent(lastAfter)}&limit=60`,
        { cache: "no-store" },
      );
      if (!res.ok) return;

      const data = await res.json();
      const incoming = Array.isArray(data?.items) ? data.items : [];
      if (!incoming.length) return;

      setItems((prev) => {
        const existing = new Set(prev.map((m) => String(m._id)));
        const merged = [...prev];
        for (const m of incoming) {
          if (!existing.has(String(m._id))) merged.push(m);
        }
        return merged;
      });

      const last = incoming[incoming.length - 1];
      if (last?.createdAt) setLastAfter(safeIso(last.createdAt));

      if (stickRef.current) setTimeout(() => scrollToBottom(true), 0);
    } catch (e) {
      console.error(e);
    }
  }

  async function send(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || !meId) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const temp = {
      _id: tempId,
      text: trimmed,
      by: meId,
      createdAt: new Date().toISOString(),
      __temp: true,
    };

    setItems((prev) => [...prev, temp]);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      setBusy(true);
      const res = await fetch(`/api/transactions/${txnId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const serverMsg = data?.message;

      setItems((prev) =>
        prev.map((m) =>
          m._id === tempId ? { ...m, ...serverMsg, __temp: false } : m,
        ),
      );

      if (serverMsg?.createdAt) setLastAfter(safeIso(serverMsg.createdAt));

      // if chat caused txn status change (first message), let parent refresh txn
      if (data?.txnStatus && typeof onStatusChange === "function") {
        onStatusChange(data.txnStatus);
      }

      setTimeout(() => pollNew(), 250);
    } catch (e) {
      setItems((prev) => prev.filter((m) => m._id !== tempId));
      alert(e.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!txnId || !meId) return;
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnId, meId]);

  useEffect(() => {
    if (!txnId || !meId) return;

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => pollNew(), 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnId, meId, lastAfter]);

  return (
    <div className="mt-4 rounded-[3px] border border-[#e7ecf8] bg-[#f9fbff] flex flex-col h-[360px]">
      <div className="px-4 py-2 border-b border-[#e7ecf8] text-sm font-semibold text-[#325082] flex items-center justify-between">
        <span>{title}</span>
        <button
          className="text-xs text-[#325082] underline underline-offset-2 hover:text-[#6881b5]"
          onClick={() => {
            stickRef.current = true;
            scrollToBottom(true);
          }}
          type="button"
        >
          Jump to latest
        </button>
      </div>

      <div
        ref={boxRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-sm"
      >
        {loading && (
          <div className="text-gray-500 text-center mt-6">Loading chat…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-gray-500 text-center mt-10">
            No messages yet. Start the conversation to discuss delivery/meetup.
          </div>
        )}

        {items.map((msg) => {
          const byId = msg?.by?._id || msg?.by;
          const mine = String(byId) === String(meId);
          const ts = msg.createdAt ? new Date(msg.createdAt) : null;

          return (
            <div
              key={String(msg._id)}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-md ${
                  mine
                    ? "bg-[#325082] text-white"
                    : "bg-white border border-gray-200 text-gray-800"
                } ${msg.__temp ? "opacity-70" : ""}`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {msg.text}
                </div>
                {ts && (
                  <div
                    className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-gray-500"}`}
                  >
                    {ts.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ChatInput disabled={busy || !meId} onSend={send} />
    </div>
  );
}
