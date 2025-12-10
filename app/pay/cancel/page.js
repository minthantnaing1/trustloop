"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PayCancel() {
  const params = useSearchParams();
  const router = useRouter();
  const txnId = params.get("txn");

  useEffect(() => {
    async function cancel() {
      if (!txnId) return router.replace("/my-orders");

      await fetch(`/api/transactions/${txnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: "stripe_checkout_cancelled",
        }),
      });

      router.replace("/my-orders");
    }

    cancel();
  }, [txnId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Cancelling payment…
    </div>
  );
}
