// components/TxnChat.js
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function reset() {
    setText("");
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="border-t border-[#e7ecf8] bg-white">
      {previews.length > 0 && (
        <div className="px-3 pt-3">
          <div className="grid grid-cols-4 gap-2">
            {previews.map((src, idx) => (
              <div
                key={src}
                className="relative rounded-md overflow-hidden border border-gray-200"
              >
                <img
                  src={src}
                  alt="preview"
                  className="w-full h-16 object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5"
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                  disabled={disabled}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Selected {previews.length} image(s) (max 3)
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!text.trim() && files.length === 0) return;
              onSend({ text, files });
              reset();
            }
          }}
          className="flex-1 rounded-[3px] border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#325082]"
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            const incoming = Array.from(e.target.files || []);
            if (!incoming.length) return;

            setFiles((prev) => {
              const merged = [...prev, ...incoming].slice(0, 3);
              return merged;
            });

            if (fileRef.current) fileRef.current.value = "";
          }}
        />

        <ActionButton
          text="+ Image"
          variant="outlineHover"
          disabled={disabled || files.length >= 3}
          onClick={() => fileRef.current?.click()}
        />

        <ActionButton
          text="Send"
          variant="primaryClick"
          disabled={disabled || (!text.trim() && files.length === 0)}
          onClick={() => {
            if (!text.trim() && files.length === 0) return;
            onSend({ text, files });
            reset();
          }}
        />
      </div>
    </div>
  );
}

export default function TxnChat({
  txnId,
  meId,
  title = "Chat",
  txnStatus,
  onStatusChange,
}) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState([]);
  const [lastAfter, setLastAfter] = useState(null);

  const boxRef = useRef(null);
  const stickRef = useRef(true);
  const pollRef = useRef(null);

  // ✅ 1) Completion lock (your existing meaning)
  const chatFinalizedLocked =
    txnStatus === "BUYER_CONFIRMED" || txnStatus === "PAID_OUT";

  // ✅ 2) Privacy / no-need-to-talk lock
  const chatPrivacyLocked = useMemo(() => {
    const CHAT_PRIVACY_LOCK_STATUSES = new Set([
      "PENDING_PAYMENT",
      "AWAITING_DONOR",
      "CANCELLED_BY_BUYER",
      "CANCELLED_BY_SELLER",
      "REJECTED_BY_ADMIN",
    ]);
    return CHAT_PRIVACY_LOCK_STATUSES.has(txnStatus);
  }, [txnStatus]);

  // ✅ Final decision
  const chatDisabled = chatFinalizedLocked || chatPrivacyLocked;

  const lockedMessage = chatFinalizedLocked
    ? "Chat is closed — order completed."
    : chatPrivacyLocked
      ? "Chat is locked for privacy until the order is accepted."
      : "";

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

  const pollNew = useCallback(async () => {
    if (!lastAfter) return;
    try {
      const res = await fetch(
        `/api/transactions/${txnId}/chat?after=${encodeURIComponent(
          lastAfter,
        )}&limit=60`,
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
  }, [lastAfter, txnId, scrollToBottom]);

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data?.url;
  }

  async function postMessageDirect({ text, images }) {
    const res = await fetch(`/api/transactions/${txnId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || "", images: images || [] }),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  async function send(payload) {
    // ✅ Block sends if chat is disabled for any reason
    if (chatDisabled) return;

    const trimmed = String(payload?.text || "").trim();
    const files = Array.isArray(payload?.files) ? payload.files : [];
    if ((!trimmed && files.length === 0) || !meId) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const temp = {
      _id: tempId,
      text: trimmed,
      images: [],
      by: meId,
      createdAt: new Date().toISOString(),
      __temp: true,
    };

    setItems((prev) => [...prev, temp]);
    setTimeout(() => scrollToBottom(true), 0);

    try {
      setBusy(true);

      let imageUrls = [];
      if (files.length) {
        imageUrls = await Promise.all(files.map(uploadOne));
        imageUrls = imageUrls.filter(Boolean);
      }

      if (imageUrls.length) {
        setItems((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, images: imageUrls } : m)),
        );
      }

      const data = await postMessageDirect({
        text: trimmed,
        images: imageUrls,
      });
      const serverMsg = data?.message;

      setItems((prev) =>
        prev.map((m) =>
          m._id === tempId ? { ...m, ...serverMsg, __temp: false } : m,
        ),
      );

      if (serverMsg?.createdAt) setLastAfter(safeIso(serverMsg.createdAt));

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
  }, [txnId, meId, pollNew]);

  useEffect(() => {
    function handleExternalChatRefresh(e) {
      if (e?.detail?.txnId && String(e.detail.txnId) !== String(txnId)) return;
      pollNew();
    }

    window.addEventListener("txn-chat:new-message", handleExternalChatRefresh);
    return () => {
      window.removeEventListener(
        "txn-chat:new-message",
        handleExternalChatRefresh,
      );
    };
  }, [txnId, pollNew]);

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
                  {Array.isArray(msg.images) && msg.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {msg.images.map((src, idx) => (
                        <a
                          key={src + idx}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={src}
                            alt="chat"
                            className="w-full h-28 object-cover rounded-md border border-white/20"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {ts && (
                  <div
                    className={`mt-1 text-[11px] ${
                      mine ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {ts.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {chatDisabled ? (
        <div className="border-t border-[#e7ecf8] bg-white px-3 py-3 text-center text-sm text-gray-500">
          {lockedMessage}
        </div>
      ) : (
        <ChatInput disabled={busy || !meId || chatDisabled} onSend={send} />
      )}
    </div>
  );
}
