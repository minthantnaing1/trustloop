"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

const LS_KEY = (id) => `fav:${id}`;

export default function FavoriteButton({
  productId,
  initialIsFav = false,
  className = "",
}) {
  // 👇 Start with server-rendered value (safe for hydration)
  const [isFav, setIsFav] = useState(initialIsFav);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 👇 After mount, sync with localStorage (no hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(productId));
      if (raw === "1") setIsFav(true);
      else if (raw === "0") setIsFav(false);
    } catch {}
  }, [productId]);

  const toggle = () => {
    startTransition(async () => {
      const next = !isFav;
      setIsFav(next);
      localStorage.setItem(LS_KEY(productId), next ? "1" : "0");

      const res = await fetch("/api/users/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        // rollback
        setIsFav(!next);
        localStorage.setItem(LS_KEY(productId), !next ? "1" : "0");
        if (res.status === 401) {
          router.push("/");
        } else {
          alert("Could not update favorites");
        }
        return;
      }

      // notify navbar
      window.dispatchEvent(
        new CustomEvent("favorites:updated", {
          detail: { delta: next ? +1 : -1 },
        })
      );
    });
  };

  return (
    <ActionButton
      onClick={toggle}
      disabled={pending}
      text={isFav ? "♥" : "♡"}
      variant={isFav ? "favPrimaryClick" : "favOutlineClick"}
      className={`w-full ${className}`}
    />
  );
}
