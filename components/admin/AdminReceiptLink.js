// components/AdminReceiptLink.js
"use client";

import { useEffect, useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";

/**
 * Props:
 * - url?: string       // preferred: Cloudinary URL
 * - receiptId?: string // legacy fallback: GET /api/admin/transactions?receipt=<id>
 */
export default function AdminReceiptLink({ url, receiptId }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState(url || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const closeBtnRef = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Optional: body scroll lock while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus the close button when modal opens
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  async function ensureLoaded() {
    if (src || !receiptId) return;
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
      if (!data?.dataUrl) throw new Error("No receipt found");
      setSrc(data.dataUrl);
    } catch (e) {
      setErr(e.message || "Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    if (!src && receiptId) ensureLoaded();
  }

  function handleClose() {
    setOpen(false);
  }

  function openInNewTab() {
    if (!src) return;
    // Keep modal open; user can come back without losing state
    const a = document.createElement("a");
    a.href = src;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (!url && !receiptId) return <span className="text-gray-400">—</span>;

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
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
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
                  <a href={src} download="receipt">
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
                  onClick={handleClose}
                  className="h-[36px]"
                />
              </div>
            </div>

            {/* Content */}
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
                {!loading && !err && !src && (
                  <p className="text-gray-500">No receipt available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
