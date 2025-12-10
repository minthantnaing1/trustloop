"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayCancel() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/my-orders");
    }, 800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Payment cancelled. Redirecting…
    </div>
  );
}
