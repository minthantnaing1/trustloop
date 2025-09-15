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
  const normalizedUrl =
    /^https?:\/\//i.test(url) || /^data:/i.test(url)
      ? url
      : `data:image/png;base64,${url}`;

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
    if (!normalizedUrl) return;

    // http(s) can open directly
    if (/^https?:\/\//i.test(normalizedUrl)) {
      window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // data: (or raw base64 normalized to data:) — open a blank tab and write the image
    const w = window.open("", "_blank");
    if (!w) return; // popup blocked
    const safeTitle = String(title || "Image");
    const html = `
    <!doctype html>
    <meta charset="utf-8">
    <title>${safeTitle}</title>
    <style>
      html,body{height:100%;margin:0}
      body{display:flex;align-items:center;justify-content:center;background:#111}
      img{max-width:100%;max-height:100%}
    </style>
    <img src="${normalizedUrl}" alt="${safeTitle}">
  `;
    w.document.write(html);
    w.document.close();
  }

  async function downloadFile() {
    try {
      setDownloading(true);

      // Works for http(s) and data: URLs; also for our normalized base64
      const res = await fetch(normalizedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const ext = blob.type?.split("/")[1] || "png";
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
        <div className="px-5 pt-4">
          {/* Desktop (sm+): title + all buttons in one row */}
          <div className="hidden sm:flex items-center justify-between">
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

          {/* Mobile (<sm): title + open button on first row, download/close on second row split left/right */}
          <div className="sm:hidden space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-[#325082] truncate">
                {title}
              </h3>
              <ActionButton
                text="Open in new tab"
                variant="primaryClick"
                onClick={openInNewTab}
                className="h-[36px] shrink-0"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
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
        </div>
        {/* Content */}
        <div className="px-5 pb-5">
          <div className="mt-3 bg-gray-50 rounded-xl p-3 max-h-[72vh] overflow-auto">
            <img
              src={normalizedUrl}
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
        className={`underline underline-offset-2 cursor-pointer text-[#325082] hover:text-[#6881b5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#325082]/40 rounded text-left ${buttonClassName}`}
      >
        {children ?? <>View Payment Slip</>}
      </button>

      {/* Render modal into body so it’s above any local stacking context */}
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
