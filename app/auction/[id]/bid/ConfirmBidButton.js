// app/auction/[id]/bid/ConfirmBidButton.js
"use client";

import { useState, useTransition } from "react";
import ActionButton from "@/components/ActionButton";
import { useRouter } from "next/navigation";

export default function ConfirmBidButton({ productId, formId, minBid }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onClick = async () => {
    const form = document.getElementById(formId);
    if (!form) return;

    const fd = new FormData(form);
    const raw = (fd.get("amount") || "").toString().trim();
    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid bid amount.");
      return;
    }
    if (amount < minBid) {
      alert(`Bid too low. Minimum is ฿${Number(minBid).toLocaleString()}.`);
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/auction/${productId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Bid failed");
      }

      // back to auction details
      startTransition(() => router.replace(`/auction/${productId}`));
    } catch (e) {
      alert(e.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <ActionButton
      text={submitting || isPending ? "Submitting..." : "Confirm Bid"}
      variant="confirmPrimaryHover"
      onClick={onClick}
      disabled={submitting || isPending}
      className="w-full"
    />
  );
}
