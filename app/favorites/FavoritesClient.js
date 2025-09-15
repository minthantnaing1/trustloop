"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export default function FavoritesClient({ items, currentUserEmail = "" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onFavChanged = (e) => {
      const { isFav } = e?.detail || {};
      // Only refresh when a favorite was ADDED (coming from elsewhere)
      if (isFav === true) {
        startTransition(() => router.refresh());
      }
    };
    window.addEventListener("favorites:updated", onFavChanged);
    return () => window.removeEventListener("favorites:updated", onFavChanged);
  }, [router]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-[426px]:gap-[12px]">
      {items.map((p) => (
        <ProductCard
          key={p._id}
          product={p}
          isOwner={false}
          variant="overlay"
          showFavToggle
          initialIsFav={true}
          currentUserEmail={currentUserEmail}
        />
      ))}
    </div>
  );
}
