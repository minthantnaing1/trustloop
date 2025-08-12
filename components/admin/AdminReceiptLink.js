"use client";

import { useEffect, useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";

export default function AdminReceiptLink({ dataUrl }) {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the close button when modal opens
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!dataUrl) return <span className="text-gray-400">—</span>;

  function openInNewTab() {
    try {
      const [header, b64] = dataUrl.split(",");
      const mime =
        header?.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";

      // base64 → Uint8Array
      const bin = atob(b64 || "");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      // Open via a temporary anchor to avoid popup/fallback issues
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener,noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Cleanup + close
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setOpen(false);
    } catch {
      // Fallback: open the data URL itself
      const a = document.createElement("a");
      a.href = dataUrl;
      a.target = "_blank";
      a.rel = "noopener,noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
            {/* Header (no divider line) */}
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
                <a href={dataUrl} download="receipt.png">
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
                  onClick={() => setOpen(false)}
                  className="h-[36px]"
                />
              </div>
            </div>

            {/* Image area */}
            <div className="px-5 pb-5">
              <div className="mt-3 bg-gray-50 rounded-xl p-3 max-h-[72vh] overflow-auto">
                <img
                  src={dataUrl}
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
