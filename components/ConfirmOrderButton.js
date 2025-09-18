"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function ConfirmOrderButton({ productId, formId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleConfirm() {
    if (loading) return; // guard double clicks
    try {
      setLoading(true);
      setErr("");

      if (!productId) {
        throw new Error("Missing productId");
      }

      // Read method + location from the form if provided
      let payload = { productId };
      if (formId) {
        const form = document.getElementById(formId);
        if (!form) throw new Error("Checkout form not found");
        const fd = new FormData(form);
        const method = (fd.get("method") || "MEETUP").toString();
        const location = (fd.get("location") || "").toString().trim();

        if (!["MEETUP", "DELIVERY"].includes(method)) {
          throw new Error("Please select a valid fulfillment method.");
        }
        if (!location) {
          throw new Error("Please provide a location/address for this order.");
        }

        payload = {
          ...payload,
          method,
          ...(method === "DELIVERY"
            ? { address: location }
            : { meetupLocation: location }),
        };
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create transaction");
      }

      const data = await res.json();
      router.replace(`/buy/pay/${data.transactionId}`); // ← replace, not push
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
