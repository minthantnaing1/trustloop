// app/buy-sell/[id]/FavoriteButton.js
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ productId, initialIsFav = false }) {
  const [isFav, setIsFav] = useState(initialIsFav);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () => {
    startTransition(async () => {
      const next = !isFav;
      setIsFav(next); // optimistic

      const res = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.status === 401) {
        setIsFav(!next);
        router.push("/"); // or your sign-in route
        return;
      }

      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        setIsFav(!next);
        alert(data?.error || "Could not update favorites");
      }
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex items-center justify-center rounded border px-3 py-2 ${
        isFav ? "bg-rose-600 text-white border-rose-700" : "border-gray-300"
      }`}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFav}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{isFav ? "♥" : "♡"}</span>
    </button>
  );
}
