// app/donation/[id]/request/ConfirmDonationRequestButton.jsx
"use client";

import { useState, useTransition } from "react";
import ActionButton from "@/components/ActionButton";
import { useRouter } from "next/navigation";

export default function ConfirmDonationRequestButton({
  productId,
  donationMode, // "instant" | "selective"
  formId,
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onClick = async () => {
    const form = document.getElementById(formId);
    if (!form) return;
    const formData = new FormData(form);
    const reason = (formData.get("reason") || "").toString().trim();

    if (reason.length < 5) {
      alert("Please write at least 5 characters for your reason.");
      return;
    }

    try {
      setSubmitting(true);

      const endpoint =
        donationMode === "instant"
          ? "/api/donations/instant"
          : "/api/donations/request";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, reason }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Request failed");
      }

      // Navigate appropriately
      if (donationMode === "instant") {
        // Order created; send requester to their order page list
        startTransition(() => router.replace("/my-orders"));
      } else {
        // Selective: back to product page to see "your request is pending"
        startTransition(() => router.replace(`/donation/${productId}`));
      }
    } catch (e) {
      alert(e.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <ActionButton
      text={
        submitting || isPending
          ? "Submitting..."
          : donationMode === "instant"
          ? "Confirm to Request"
          : "Send Request"
      }
      variant="primaryClick"
      onClick={onClick}
      disabled={submitting || isPending}
      className="w-full"
    />
  );
}
