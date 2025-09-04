// components/AdminReceiptLink.js
"use client";

import { useRef, useState, useEffect } from "react";
import ActionButton from "@/components/ActionButton";

export default function AdminReceiptLink({ url }) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

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

  // Focus on close button
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[#325082] underline underline-offset-2 hover:text-[#274066] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#325082]/40 rounded"
      >
        View Receipt
      </button>

      {open && (
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
              <h3 className="text-lg font-semibold text-[#325082]">
                Payment Receipt
              </h3>
              <div className="flex items-center gap-2">
                <ActionButton
                  text="Open in new tab"
                  variant="primaryClick"
                  onClick={openInNewTab}
                  className="h-[36px]"
                />
                <a href={url} download="receipt">
                  <ActionButton
                    text="Download"
                    variant="outlineClick"
                    className="h-[36px]"
                  />
                </a>
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
                  alt="Buyer payment receipt"
                  className="block max-w-full h-auto rounded-md shadow"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
