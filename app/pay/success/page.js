"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaySuccess() {
  const params = useSearchParams();
  const router = useRouter();
  const txnId = params.get("txn");

  useEffect(() => {
    async function confirm() {
      if (!txnId) return router.replace("/my-orders");

      await fetch(`/api/transactions/${txnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_success",
        }),
      });

      router.replace("/my-orders");
    }

    confirm();
  }, [txnId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold text-green-600">
        🎉 Payment Successful
      </h1>
      <p>Your payment is secured in escrow.</p>
      <p className="text-sm opacity-70">Finalizing your order…</p>
    </div>
  );
}
