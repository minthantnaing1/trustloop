"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export default function FavoritesClient({ items, currentUserEmail = "" }) {
  const router = useRouter();

  useEffect(() => {
    const onFavChanged = () => router.refresh(); // re-fetch page data
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
