// components/admin/AdminRefundPanel.js
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";
import StatusPill from "@/components/StatusPill";
import { PhoneIcon } from "@heroicons/react/24/outline";

function money(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}

function calcFee(total) {
  // keep simple; you can switch to Math.ceil/floor later
  return Math.round(Number(total || 0) * 0.05);
}

export default function AdminRefundPanel({ txn }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  const [adminRefundReceiptUrl, setAdminRefundReceiptUrl] = useState(
    txn?.adminRefundReceiptUrl || "",
  );

  const kindUp = String(txn?.kind || "").toUpperCase();

  // allowed only for BUY_SELL cancelled cases
  const isCancelled =
    txn?.status === "CANCELLED_BY_BUYER" ||
    txn?.status === "CANCELLED_BY_SELLER";

  const alreadyRefunded = Boolean(
    txn?.adminRefundReceiptUrl || adminRefundReceiptUrl,
  );
  const canRefund =
    ["BUY_SELL", "AUCTION"].includes(kindUp) && isCancelled && !alreadyRefunded;

  const buyer = txn?.buyer || {};
  const product = txn?.product || {};

  // buyer gets 95%, platform keeps 5%
  const total = Number(txn?.total || 0);
  const fee = calcFee(total);
  const buyerNet = Math.max(0, total - fee);

  // where admin sends money back
  const buyerScanUrl = buyer?.defaultScanCode || "";

  function pick() {
    fileRef.current?.click();
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setErr("");
    setPreview(URL.createObjectURL(f));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function markRefunded() {
    if (!file) {
      setErr("Please upload the refund transfer slip first.");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      // 1) upload receipt
      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok || !upData?.url) {
        throw new Error(upData?.error || "Upload failed");
      }

      // 2) mark as refunded
      const res = await fetch(`/api/admin/transactions/${txn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_refunded",
          refundUrl: upData.url,
          refundFee: fee,
          buyerRefundNet: buyerNet,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setAdminRefundReceiptUrl(upData.url);
      clearFile();
      router.refresh();
    } catch (e) {
      setErr(e.message || "Failed to mark refunded");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const Card = ({ children, className = "" }) => (
    <div className={`rounded-[3px] bg-[#f9fbff] p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="rounded-[3px] bg-white shadow mb-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#1f2f4c]">
          Refund to Buyer
        </h2>
        <span className="text-sm text-gray-500">
          Status: <StatusPill status={txn.status} />
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: buyer QR before refund / admin slip after */}
        {!alreadyRefunded ? (
          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
              Buyer QR Scan (for refund)
            </div>

            {buyerScanUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[560px] mx-auto h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                  <img
                    src={buyerScanUrl}
                    alt="Buyer scan code"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="mt-2">
                  <SlipLink url={buyerScanUrl} title="Buyer Qr Scan">
                    View full image
                  </SlipLink>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Buyer has not uploaded a qr scan yet (profile:{" "}
                <code>defaultScanCode</code>).
              </p>
            )}

            <p className="text-[11px] text-gray-500 mt-3">
              Buyer refund is always <b>95%</b> of paid amount. Platform fee is{" "}
              <b>5%</b>.
            </p>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
              Admin Refund Transfer Slip
            </div>

            {adminRefundReceiptUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[560px] h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                  <img
                    src={adminRefundReceiptUrl}
                    alt="Refund receipt"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="mt-2">
                  <SlipLink
                    url={adminRefundReceiptUrl}
                    title="Admin Refund Slip"
                  >
                    View full image
                  </SlipLink>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">—</p>
            )}

            <p className="text-xs text-emerald-700 mt-3 font-medium">
              Refund has already been processed.
            </p>
          </Card>
        )}

        {/* RIGHT: info + upload */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="text-sm text-gray-500">Product</div>
            <div className="font-semibold text-[#1f2f4c] truncate">
              {product?.title || "-"}
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Paid</span>
                <span className="font-medium">{money(total)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Fee (5%)</span>
                <span className="font-medium">-{money(fee)}</span>
              </div>

              <div className="border-t border-gray-300 my-1" />

              <div className="flex justify-between text-[#1f2f4c] font-semibold">
                <span>Buyer gets</span>
                <span>{money(buyerNet)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="text-sm text-gray-500">Buyer</div>
            <div className="font-semibold text-[#1f2f4c]">
              {buyer?.name || buyer?.email || "-"}
            </div>
            <div className="text-sm text-gray-600">{buyer?.email}</div>
            {buyer?.phone && (
              <a
                href={`tel:${buyer.phone}`}
                className="flex items-center gap-1 text-sm text-[#325082] hover:underline"
              >
                <PhoneIcon className="w-4 h-4" />
                {buyer.phone}
              </a>
            )}
          </Card>

          <Card>
            <div className="text-sm text-gray-500">Amount to Refund</div>
            <div className="text-2xl font-bold text-[#1f2f4c]">
              {money(buyerNet)}
            </div>
          </Card>

          {/* Upload / CTA */}
          {!alreadyRefunded && (
            <Card>
              <label className="block text-sm font-semibold text-[#1f2f4c] mb-2">
                Upload refund transfer slip
              </label>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />

              {!preview ? (
                <button
                  type="button"
                  onClick={pick}
                  className="w-full py-3 border-2 border-dashed border-[#cfd8e3] rounded-lg text-sm text-gray-500 hover:border-[#325082] hover:text-[#325082] transition"
                >
                  Select image…
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={preview}
                    alt="Refund preview"
                    className="w-[56px] h-[56px] rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#1f2f4c] truncate">
                      {file?.name || "receipt.png"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {file?.size ? Math.ceil(file.size / 1024) : 0} KB
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="mt-1 text-xs text-[#325082] underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <ActionButton
                text={busy ? "Saving…" : "Mark as Refunded"}
                variant="submitPrimaryClick"
                onClick={markRefunded}
                disabled={busy || !canRefund}
                className="mt-3 w-full"
              />

              {err && <p className="text-xs text-red-600 mt-2">{err}</p>}

              {!canRefund && (
                <p className="text-xs text-gray-500 mt-2">
                  Available only for cancelled Buy/Sell or Auction orders.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
