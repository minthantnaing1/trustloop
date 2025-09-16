"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import SlipLink from "@/components/SlipLink";
import StatusPill from "@/components/StatusPill";
import { PhoneIcon } from "@heroicons/react/24/outline";

export default function AdminPayoutPanel({ txn }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  // ← keep UI reactive after submit (no redirect)
  const [status, setStatus] = useState(txn?.status || "");
  const [adminReceiptUrl, setAdminReceiptUrl] = useState(
    txn?.adminPayoutReceiptUrl || ""
  );

  const canPay = txn?.status === "BUYER_CONFIRMED";
  const alreadyPaid = txn?.status === "PAID_OUT";

  const seller = txn?.seller || {};
  const product = txn?.product || {};
  const scanUrl = seller?.defaultScanCode || "";

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

  async function markPaid() {
    if (!file) {
      setErr("Please upload the transfer payment slip first.");
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
      if (!up.ok || !upData?.url)
        throw new Error(upData?.error || "Upload failed");

      // 2) mark as paid (admin endpoint)
      const res = await fetch(`/api/admin/transactions/${txn._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "mark_paid", payoutUrl: upData.url }),
      });
      if (!res.ok) throw new Error(await res.text());

      // ✅ Update local UI instead of redirecting
      setAdminReceiptUrl(upData.url);
      setStatus("PAID_OUT");
      clearFile(); // optional: clear preview
      setBusy(false);
    } catch (e) {
      setErr(e.message || "Failed to mark paid");
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#1f2f4c]">
          Payout to Seller
        </h2>
        <span className="text-sm text-gray-500">
          Status: <StatusPill status={txn.status} />
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Large scan image (only before payout) */}
        {!alreadyPaid ? (
          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
              Seller Qr Scan
            </div>

            {scanUrl ? (
              <>
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[560px] mx-auto h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                    <img
                      src={scanUrl}
                      alt="Seller scan code"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="mt-2">
                    <SlipLink url={scanUrl} title="Seller Qr Scan">
                      View full image
                    </SlipLink>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Seller has not uploaded a qr scan yet (profile:{" "}
                <code>defaultScanCode</code>).
              </p>
            )}

            <p className="text-[11px] text-gray-500 mt-3">
              Make sure the amount matches exactly before marking as paid.
            </p>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
              Admin Transfer Slip
            </div>
            {adminReceiptUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[560px] h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                  <img
                    src={adminReceiptUrl}
                    alt="Payout receipt"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="mt-2">
                  <SlipLink url={adminReceiptUrl} title="Admin Transfer Slip">
                    View full image
                  </SlipLink>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">—</p>
            )}
            <p className="text-xs text-emerald-700 mt-3 font-medium">
              Transaction has already been paid out.
            </p>
          </Card>
        )}

        {/* RIGHT: Info cards + compact upload */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <div className="text-sm text-gray-500">Product</div>
            <div className="font-semibold text-[#1f2f4c] truncate">
              {product?.title || "-"}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Total: ฿{Number(txn?.total || 0).toLocaleString()}
            </div>
          </Card>

          <Card>
            <div className="text-sm text-gray-500">Seller</div>
            <div className="font-semibold text-[#1f2f4c]">
              {seller?.name || seller?.email || "-"}
            </div>
            <div className="text-sm text-gray-600">{seller?.email}</div>
            {seller?.phone && (
              <a
                href={`tel:${seller.phone}`}
                className="flex items-center gap-1 text-sm text-[#325082] hover:underline"
              >
                <PhoneIcon className="w-4 h-4" />
                {seller.phone}
              </a>
            )}
          </Card>

          <Card>
            <div className="text-sm text-gray-500">Amount to Pay</div>
            <div className="text-2xl font-bold text-[#1f2f4c]">
              ฿{Number(txn?.sellerNet || 0).toLocaleString()}
            </div>
          </Card>

          {/* Compact upload / CTA (hidden after payout) */}
          {!alreadyPaid && (
            <Card>
              <label className="block text-sm font-semibold text-[#1f2f4c] mb-2">
                Upload payout transfer slip
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
                    alt="Payout preview"
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
                text={busy ? "Saving…" : "Mark as Paid"}
                variant="submitPrimaryClick"
                onClick={markPaid}
                disabled={busy || !canPay}
                className="mt-3 w-full"
              />

              {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
              {!canPay && (
                <p className="text-xs text-gray-500 mt-2">
                  Available only after buyer has confirmed receipt.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
