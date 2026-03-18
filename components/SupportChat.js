// components/SupportChat.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

function displayName(by, fallback) {
  if (!by) return fallback || "Unknown";
  if (typeof by === "string") return fallback || "Unknown";
  return by?.name || by?.email || fallback || "Unknown";
}

function closedMessage(status) {
  const s = String(status || "").toUpperCase();
  if (s === "RESOLVED") return "This ticket has been resolved.";
  if (s === "REJECTED") return "This ticket has been closed (rejected).";
  return "This ticket is closed.";
}

export default function SupportChat({
  messages = [],
  onSend,
  disabled,
  placeholder = "Write a message…",

  viewerRole = "USER",
  requireAdminFirstReply = false,

  ticketStatus,
  statusUpdatedBy,
  statusUpdatedAt,

  maxHeightClass = "lg:max-h-[360px] max-h-[300px]",
}) {
  const [draft, setDraft] = useState("");
  const [warn, setWarn] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const sorted = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    return [...list].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [messages]);

  const hasAdminReply = useMemo(() => {
    return sorted.some((m) => String(m?.role || "").toUpperCase() === "ADMIN");
  }, [sorted]);

  const isClosed = useMemo(() => {
    const s = String(ticketStatus || "").toUpperCase();
    return s === "RESOLVED" || s === "REJECTED";
  }, [ticketStatus]);

  const blockedByAdminFirst =
    requireAdminFirstReply && viewerRole === "USER" && !hasAdminReply;

  const finalDisabled =
    !!disabled || isClosed || blockedByAdminFirst || uploading;

  function isRightSide(messageRole) {
    const r = String(messageRole || "").toUpperCase();
    if (viewerRole === "ADMIN") return r === "ADMIN";
    return r === "USER";
  }

  async function uploadOne(file) {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    return {
      url: data?.url || "",
      publicId: data?.publicId || "",
    };
  }

  async function handleSend() {
    const text = String(draft || "").trim();

    if (!text && files.length === 0) return;

    if (blockedByAdminFirst) {
      setWarn("Please wait for admin reply first.");
      return;
    }

    try {
      setWarn("");
      setUploading(true);

      let uploadedImages = [];
      if (files.length) {
        uploadedImages = await Promise.all(files.map(uploadOne));
        uploadedImages = uploadedImages.filter((img) => img?.url);
      }

      await onSend?.({
        text,
        images: uploadedImages,
      });

      setDraft("");
      setFiles([]);
      setPreviews([]);

      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setWarn(e?.message || "Failed to send message");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm flex flex-col">
      <div className={`overflow-y-auto p-4 space-y-3 ${maxHeightClass}`}>
        {sorted.length ? (
          sorted.map((m, idx) => {
            const role = String(m?.role || "").toUpperCase();
            const right = isRightSide(role);
            const isAdmin = role === "ADMIN";

            const baseName =
              viewerRole === "ADMIN"
                ? displayName(m?.by, isAdmin ? "Admin" : "User")
                : displayName(m?.by, isAdmin ? "Admin" : "User");

            const whoLabel = `${isAdmin ? "Admin" : "User"}: ${baseName}`;

            return (
              <div
                key={(m?.at || "") + "-" + idx}
                className={`flex ${right ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm whitespace-pre-line border
                    ${
                      isAdmin
                        ? "bg-slate-100 border-slate-200"
                        : "bg-sky-50 border-sky-200"
                    }`}
                >
                  <div className="text-[11px] text-slate-500 mb-1">
                    <span className="font-medium text-slate-600">
                      {whoLabel}
                    </span>{" "}
                    · {formatDateTime(m?.at)}
                  </div>

                  {!!String(m?.text || "").trim() && (
                    <div className="text-slate-800">{m?.text}</div>
                  )}

                  {Array.isArray(m?.images) && m.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {m.images.map((img, imageIdx) => {
                        const src =
                          typeof img === "string" ? img : img?.url || "";
                        if (!src) return null;

                        return (
                          <a
                            key={`${src}-${imageIdx}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <img
                              src={src}
                              alt={`attachment-${imageIdx + 1}`}
                              className="w-full h-28 object-cover rounded-md border border-slate-200"
                            />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-slate-500">No messages yet.</div>
        )}
      </div>

      {onSend && (
        <div className="border-t border-slate-200 p-3">
          {(warn || blockedByAdminFirst || isClosed) && (
            <div className="mb-2 text-[12px] rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
              {warn ||
                (isClosed
                  ? closedMessage(ticketStatus)
                  : "Please wait for admin reply first.")}
            </div>
          )}

          {statusUpdatedBy && statusUpdatedAt && (
            <div className="mb-2 text-[12px] text-slate-500">
              Status updated by{" "}
              <span className="font-medium text-slate-700">
                {`Admin: ${displayName(statusUpdatedBy, "Admin")}`}
              </span>{" "}
              · {formatDateTime(statusUpdatedAt)}
            </div>
          )}

          {previews.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div
                    key={src}
                    className="relative rounded-md overflow-hidden border border-slate-200"
                  >
                    <img
                      src={src}
                      alt="preview"
                      className="w-full h-20 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      disabled={finalDisabled}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                Selected {previews.length} image(s) (max 3)
              </div>
            </div>
          )}

          <textarea
            rows={3}
            className="w-full border border-slate-200 rounded-md p-2 text-sm disabled:bg-slate-50"
            placeholder={placeholder}
            disabled={finalDisabled}
            value={draft}
            onChange={(e) => {
              setWarn("");
              setDraft(e.target.value);
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            disabled={finalDisabled}
            className="hidden"
            onChange={(e) => {
              const incoming = Array.from(e.target.files || []);
              if (!incoming.length) return;

              setFiles((prev) => [...prev, ...incoming].slice(0, 3));

              if (fileRef.current) fileRef.current.value = "";
            }}
          />

          <div className="mt-2 flex justify-between gap-2">
            <button
              type="button"
              className="px-4 py-1.5 text-sm rounded-md border border-slate-300 bg-white text-slate-700 disabled:opacity-50"
              disabled={finalDisabled || files.length >= 3}
              onClick={() => fileRef.current?.click()}
            >
              + Image
            </button>

            <button
              className="px-4 py-1.5 text-sm rounded-md bg-[#325082] text-white disabled:opacity-50"
              disabled={
                finalDisabled || (!String(draft).trim() && files.length === 0)
              }
              onClick={handleSend}
            >
              {uploading ? "Uploading..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
