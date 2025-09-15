"use client";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

const LS_KEY = (id) => `fav:${id}`;

export default function FavoriteButton({
  productId,
  initialIsFav = false,
  className = "",
  variant = "button", // "button" | "icon"
  stopNavigation = false, // prevents card link navigation when clicking the icon
}) {
  // Start with server-rendered value (safe for hydration)
  const [isFav, setIsFav] = useState(initialIsFav);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // After mount, sync with localStorage (no hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY(productId));
      if (raw === "1") setIsFav(true);
      else if (raw === "0") setIsFav(false);
    } catch {}
  }, [productId]);

  const toggle = (e) => {
    if (stopNavigation && e) {
      e.preventDefault();
      e.stopPropagation();
    }

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

  // Compact icon variant (for product cards)
  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        disabled={pending}
        onClick={toggle}
        className={`absolute top-1.5 right-1.5 z-10 ${className}`}
      >
        <span
          className="relative inline-flex h-9 w-9 items-center justify-center
                   rounded-full ring-1 ring-white/50 shadow-lg
                   bg-white/25 hover:bg-white/50
                   backdrop-blur-2xs transition"
        >
          {isFav ? (
            <HeartSolid className="w-5 h-5 text-red-600" />
          ) : (
            <HeartOutline className="w-5 h-5 text-red-600" />
          )}
        </span>
      </button>
    );
  }

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
