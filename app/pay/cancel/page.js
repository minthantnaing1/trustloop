"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayCancelPage() {
  const router = useRouter();

  useEffect(() => {
    // ⛔ Do NOT cancel transaction
    // ⏳ Let auto-expiry + webhook logic handle everything
    router.replace("/my-orders");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Redirecting to your orders…
    </div>
  );
}
