"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PayCancelClient() {
  const router = useRouter();
  const params = useSearchParams();
  const txnId = params.get("txn");

  useEffect(() => {
    async function cancelTxn() {
      if (txnId) {
        try {
          await fetch(`/api/transactions/${txnId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "cancel",
              reason: "stripe_checkout_cancelled",
            }),
          });
        } catch (err) {
          console.error("Cancel failed:", err);
        }
      }

      router.replace("/my-orders");
    }

    cancelTxn();
  }, [txnId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Payment cancelled. Redirecting…
    </div>
  );
}
