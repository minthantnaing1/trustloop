"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function ConfirmOrderButton({ productId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleConfirm() {
    try {
      setLoading(true);
      setErr("");

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create transaction");
      }

      const data = await res.json();
      // Navigate to Pay & Upload under buy-sell
      router.push(`/buy-sell/pay/${data.transactionId}`);
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ActionButton
        text={loading ? "Creating order..." : "Confirm Order"}
        variant="confirmPrimaryHover"
        onClick={handleConfirm}
        disabled={loading}
      />
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
