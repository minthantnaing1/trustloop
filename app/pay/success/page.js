"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaySuccess() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/my-orders");
    }, 1200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold text-green-600">
        🎉 Payment Completed
      </h1>
      <p>Your payment is being verified.</p>
      <p className="text-sm opacity-70">Redirecting…</p>
    </div>
  );
}
