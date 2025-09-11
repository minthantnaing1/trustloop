// components/SlipLink.js
"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ActionButton from "@/components/ActionButton";

export default function SlipLink({
  url,
  title = "Payment Slip",
  children,
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeBtnRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus close on open
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  function openInNewTab() {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadFile() {
    try {
      setDownloading(true);
      const res = await fetch(url, { mode: "cors", credentials: "omit" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = blob.type?.split("/")[1] || "jpg";
      const filename = `payment-slip.${ext}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error("Download failed; opening in new tab instead:", e);
      openInNewTab();
    } finally {
      setDownloading(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[30000] bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <h3 className="text-lg font-semibold text-[#325082]">{title}</h3>
          <div className="flex items-center gap-2">
            <ActionButton
              text="Open in new tab"
              variant="primaryClick"
              onClick={openInNewTab}
              className="h-[36px]"
            />
            <ActionButton
              text={downloading ? "Downloading..." : "Download"}
              disabled={downloading}
              variant="outlineClick"
              onClick={downloadFile}
              className="h-[36px]"
            />
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
            <img
              src={url}
              alt="Buyer payment slip"
              className="block max-w-full h-auto rounded-md shadow"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`underline underline-offset-2 cursor-pointer hover:text-[#325082] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#325082]/40 rounded text-left ${buttonClassName}`}
      >
        {children ?? <>View Payment Slip</>}
      </button>

      {/* Render modal into body so it’s above any local stacking context */}
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
