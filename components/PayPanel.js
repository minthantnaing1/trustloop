// components/PayPanel.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function PayPanel({ txn }) {
  const router = useRouter();

  // ---- state ----
  const [timeLeft, setTimeLeft] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);

  // countdown
  const expiresAt = useMemo(() => {
    const t = new Date(txn.expiresAt).getTime();
    return Number.isFinite(t) ? t : Date.now() + 5 * 60 * 1000;
  }, [txn.expiresAt]);

  useEffect(() => {
    function tick() {
      const ms = Math.max(0, expiresAt - Date.now());
      const s = Math.ceil(ms / 1000);
      setTimeLeft(s);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // auto-cancel on timeout
  const cancelled = useRef(false);
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0 && !cancelled.current) {
      cancelled.current = true;
      fetch(`/api/transactions/${txn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "timeout" }),
      }).finally(() => router.replace("/my-orders"));
    }
  }, [timeLeft, txn._id, router]);

  const mmss =
    timeLeft === null
      ? "--:--"
      : `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
          timeLeft % 60
        ).padStart(2, "0")}`;

  // uploader helpers
  function openPicker() {
    fileInputRef.current?.click();
  }
  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErr("");
    const url = URL.createObjectURL(f);
    setPreview(url);
  }
  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setFile(f);
    setErr("");
    const url = URL.createObjectURL(f);
    setPreview(url);
  }
  function onDragOver(e) {
    e.preventDefault();
  }
  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // submit (upload then PATCH)
  async function handleUpload() {
    if (!file) {
      setErr("Please choose an image of your receipt.");
      return;
    }
    if (timeLeft !== null && timeLeft <= 0) {
      setErr("Payment window expired. Please create a new order.");
      return;
    }

    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData?.url) {
        throw new Error(upData?.error || "Upload failed");
      }

      const res = await fetch(`/api/transactions/${txn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_receipt",
          buyerReceiptUrl: upData.url,
          buyerReceiptPublicId: upData.publicId || "",
        }),
      });
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to submit receipt");

      router.replace("/my-orders");
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setBusy(false);
    }
  }

  function payLater() {
    setBusy(true);
    fetch(`/api/transactions/${txn._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: "user_abandoned" }),
    }).finally(() => router.replace("/my-orders"));
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: QR + timer */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Scan to pay (Admin)
            </h3>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-[#f5eaea] text-[#b42222] border">
              ⏱ {mmss}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-center">
            <div className="p-1 rounded-xl border">
              <img
                src="/AbelScan.jpg"
                alt="PromptPay QR"
                className="w-[320px] h-[320px] object-contain" // ⬅️ slightly bigger than before
              />
            </div>
          </div>

          <p className="text-sm text-center text-gray-500 mt-3">
            Send exactly{" "}
            <span className="font-semibold text-[#1f2f4c]">
              {Number(txn.total).toLocaleString()} ฿
            </span>{" "}
            to the TrustLoop admin account, then upload your payment receipt
            below.
          </p>

          <div className="mt-3 bg-yellow-50 border border-yellow-300 text-yellow-800 text-[12px] rounded-md px-3 py-2 text-center">
            Please upload your payment slip with 5 minutes — if time runs out or
            you leave, the order will be auto-cancelled (you can still return
            via My Orders within that time).
          </div>
        </div>

        {/* Right: order + upload */}
        <div className="w-full lg:w-[450px]">
          <div className="rounded-xl border overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-[#f3f6fb] to-white">
              <h3 className="font-semibold text-[#325082]">Order</h3>
            </div>

            <div className="p-4">
              {/* Order row */}
              <div className="flex gap-3">
                <img
                  src={
                    txn.product?.defaultImage ||
                    txn.product?.images?.[0] ||
                    "/placeholder.png"
                  }
                  alt={txn.product?.title}
                  className="w-[68px] h-[68px] rounded-lg object-cover border"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#1f2f4c]">
                    {txn.product?.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {Number(txn.price).toLocaleString()} ฿ + fee{" "}
                    {Number(txn.fee).toLocaleString()} ฿
                  </div>
                  <div className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="font-semibold text-[#1f2f4c]">
                      {Number(txn.total).toLocaleString()} ฿
                    </span>
                  </div>
                </div>
              </div>

              <div className="my-4 border-t" />

              {/* Upload area */}
              <label className="block text-sm font-medium text-[#1f2f4c] mb-2">
                Upload receipt
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />

              {/* Dropzone */}
              <div
                onClick={openPicker}
                onDrop={onDrop}
                onDragOver={onDragOver}
                role="button"
                tabIndex={0}
                className="group relative flex flex-col items-center justify-center gap-2 w/full min-h-[140px] border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer
                           border-[#9fb3d6] hover:border-[#325082] bg-[#f7f9fc] hover:bg-[#f3f7ff] transition-colors"
              >
                {!preview ? (
                  <>
                    <div className="text-3xl">🧾</div>
                    <div className="text-sm text-[#1f2f4c] font-medium">
                      Click to upload or drag & drop
                    </div>
                    <div className="text-xs text-gray-500">
                      PNG or JPG, clear screenshot of the transfer
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="w-[72px] h-[72px] rounded-lg object-cover border"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-[#1f2f4c] font-medium truncate">
                        {file?.name || "receipt.png"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {file?.size ? Math.ceil(file.size / 1024) : 0} KB
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="mt-1 text-xs text-[#325082] underline hover:no-underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <ActionButton
                text={busy ? "Submitting..." : "Submit Receipt"}
                variant="submitPrimaryClick"
                onClick={handleUpload}
                disabled={busy || timeLeft === null || timeLeft <= 0 || !file}
                className="mt-3"
              />

              <ActionButton
                text="Cancel Order"
                variant="cancelOrderOutlineClick"
                onClick={payLater}
                disabled={busy}
                className="mt-2"
              />

              {err ? <p className="text-xs text-red-600 mt-2">{err}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
