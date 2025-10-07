"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export default function FavoritesClient({ items, currentUserEmail = "" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Track which product IDs are currently rendered
  const idsRef = useRef(new Set(items.map((p) => String(p._id))));
  useEffect(() => {
    idsRef.current = new Set(items.map((p) => String(p._id)));
  }, [items]);

  useEffect(() => {
    const onFavChanged = (e) => {
      const { isFav, productId } = e?.detail || {};
      // Only refresh if an item was added that we DON'T already have on this page
      if (
        isFav === true &&
        productId &&
        !idsRef.current.has(String(productId))
      ) {
        startTransition(() => router.refresh());
      }
    };
    window.addEventListener("favorites:updated", onFavChanged);
    return () => window.removeEventListener("favorites:updated", onFavChanged);
  }, [router]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
      {items.map((p) => (
        <ProductCard
          key={p._id}
          product={p}
          variant="overlay"
          isOwner={false}
          currentUserEmail={currentUserEmail}
          showFavToggle
          initialIsFav={true}
        />
      ))}
    </div>
  );
}
