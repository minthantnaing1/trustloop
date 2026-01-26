// components/UploadProofModal.js
"use client";

import { useEffect, useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";

export default function UploadProofModal({
  open,
  busy = false,
  onClose,
  onConfirm,
}) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
        aria-label="Close modal backdrop"
      />

      <div className="relative w-[92vw] max-w-md rounded-[10px] bg-white shadow-xl ring-1 ring-black/5">
        <div className="px-4 py-3 border-b border-[#e7ecf8] flex items-center justify-between">
          <div className="text-sm font-semibold text-[#325082]">
            Upload Delivery Proof
          </div>
          <button
            type="button"
            onClick={busy ? undefined : onClose}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {previews.length > 0 ? (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, idx) => (
                  <div
                    key={src}
                    className="relative rounded-md overflow-hidden border border-gray-200"
                  >
                    <img
                      src={src}
                      alt="proof preview"
                      className="w-full h-20 object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5"
                      disabled={busy}
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>Selected {previews.length} image(s)</span>
                <button
                  type="button"
                  className="text-[#325082] underline underline-offset-2 hover:text-[#6881b5]"
                  disabled={busy}
                  onClick={() => {
                    setFiles([]);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Clear all
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-gray-300 bg-[#f9fbff] p-6 text-center">
              <div className="text-sm font-medium text-gray-700">
                Add up to 3 proof images
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Clear photos help buyers confirm faster.
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const incoming = Array.from(e.target.files || []);
              if (!incoming.length) return;

              setFiles((prev) => [...prev, ...incoming].slice(0, 3));
              if (fileRef.current) fileRef.current.value = "";
            }}
          />

          {/* ✅ Centered upload button */}
          <div className="mt-4 flex justify-center">
            <ActionButton
              text={files.length ? "Add More Images" : "Choose Images"}
              variant="outlineHover"
              disabled={busy || files.length >= 3}
              onClick={() => fileRef.current?.click()}
            />
          </div>

          {/* ✅ Cancel left / Confirm right */}
          <div className="mt-5 flex items-center justify-between">
            <ActionButton
              text="Cancel"
              variant="outlineHover"
              disabled={busy}
              onClick={onClose}
            />
            <ActionButton
              text="Confirm Upload"
              variant="primaryClick"
              disabled={busy || files.length === 0}
              onClick={() => onConfirm(files)}
            />
          </div>

          <div className="mt-3 text-[11px] text-gray-500 text-center">
            Max 3 images per upload.
          </div>
        </div>
      </div>
    </div>
  );
}
