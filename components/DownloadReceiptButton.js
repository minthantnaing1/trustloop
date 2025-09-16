"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";

export default function DownloadReceiptButton({
  transactionId,
  className = "",
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(e) {
    // if the button lives inside a <form>, prevent submit
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/receipt`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${transactionId}.pdf`;

      a.dataset.suppressOverlay = "true"; // ⬅️ tell overlay to ignore
      a.rel = "noopener"; // safety
      a.target = "_self"; // stay in same tab

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Failed to download receipt");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ActionButton
      type="button" // ⬅️ important (avoid form submit)
      onClick={handleDownload}
      text={downloading ? "Preparing…" : "Download PDF Receipt"}
      variant="primaryClick"
      disabled={downloading}
      className={className}
      data-suppress-overlay="true" // ⬅️ match the overlay’s attribute
    />
  );
}
