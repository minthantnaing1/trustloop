"use client";

import { useEffect, useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";

/**
 * Props:
 * - dataUrl?: string            // if provided (local dev), used directly
 * - receiptId?: string          // if provided, will fetch /api/admin/transactions?receipt=<id> on open
 * - hasReceipt?: boolean        // used by parent to decide to render link or "—"
 */
export default function AdminReceiptLink({
  dataUrl,
  receiptId,
  hasReceipt = true,
}) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState(dataUrl || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const closeBtnRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus when modal opens
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  async function ensureLoaded() {
    if (src || !receiptId) return; // already have it or nothing to load
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(
        `/api/admin/transactions?receipt=${encodeURIComponent(receiptId)}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.dataUrl) throw new Error("No receipt");
      setSrc(data.dataUrl);
    } catch (e) {
      setErr(e.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    // lazy fetch if needed
    if (!src && receiptId) ensureLoaded();
  }

  function openInNewTab() {
    const data = src;
    if (!data) return;
    try {
      const [header, b64] = data.split(",");
      const mime =
        header?.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";
      const bin = atob(b64 || "");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener,noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setOpen(false);
    } catch {
      // Fallback: open the data URL itself
      const a = document.createElement("a");
      a.href = data;
      a.target = "_blank";
      a.rel = "noopener,noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setOpen(false);
    }
  }

  if (!hasReceipt) return <span className="text-gray-400">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-[#325082] underline underline-offset-2 hover:text-[#274066] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#325082]/40 rounded"
        title="View payment receipt"
      >
        View Receipt
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Payment receipt"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4">
              <h3 className="text-lg font-semibold text-[#325082]">
                Payment Receipt
              </h3>
              <div className="flex items-center gap-2">
                <ActionButton
                  text="Open in new tab"
                  variant="primaryClick"
                  onClick={openInNewTab}
                  className="h-[36px]"
                  disabled={!src || loading}
                />
                {src && (
                  <a href={src} download="receipt.png">
                    <ActionButton
                      text="Download"
                      variant="outlineClick"
                      className="h-[36px]"
                    />
                  </a>
                )}
                <ActionButton
                  ref={closeBtnRef}
                  text="Close"
                  variant="outlineClick"
                  onClick={() => setOpen(false)}
                  className="h-[36px]"
                />
              </div>
            </div>

            {/* Image area */}
            <div className="px-5 pb-5">
              <div className="mt-3 bg-gray-50 rounded-xl p-3 max-h-[72vh] overflow-auto">
                {loading && <p className="text-gray-500">Loading receipt…</p>}
                {err && <p className="text-red-600">{err}</p>}
                {src && (
                  <img
                    src={src}
                    alt="Buyer payment receipt"
                    className="block max-w-full h-auto rounded-md shadow"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
