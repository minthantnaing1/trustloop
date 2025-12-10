"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";

export default function ConfirmOrderButton({ productId, formId }) {
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

      // ✅ Read method + location from form
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

      // 1️⃣ Create transaction (UNCHANGED logic)
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create transaction");
      }

      const { transactionId } = await res.json();

      // 2️⃣ Create Stripe Checkout session
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      if (!checkoutRes.ok) {
        const t = await checkoutRes.text();
        throw new Error(t || "Failed to start payment");
      }

      const { url } = await checkoutRes.json();
      if (!url) throw new Error("Missing payment URL");

      // 3️⃣ Redirect to Stripe
      window.location.href = url;
    } catch (e) {
      setErr(e.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ActionButton
        text={loading ? "Redirecting to payment..." : "Confirm Order & Pay"}
        variant="confirmPrimaryHover"
        onClick={handleConfirm}
        disabled={loading}
      />
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
