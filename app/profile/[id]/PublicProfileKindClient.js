"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MyProductCard from "@/components/MyProductCard";

/* compact Kind pill (same feel as My Orders / ProfileKindClient) */
function KindSwitch({ kind, setKind }) {
  const options = [
    { v: "BUY_SELL", label: "Buy/Sell" },
    { v: "DONATION", label: "Donation" },
  ];
  const activeIdx = options.findIndex((o) => o.v === kind);

  return (
    <div className="relative inline-grid grid-cols-2 rounded-full bg-slate-100 p-1 shadow-sm w-[190px]">
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#325082]
                    transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                    transform-gpu will-change-transform
                    ${activeIdx === 0 ? "translate-x-0" : "translate-x-full"}`}
      />
      {options.map((o) => {
        const active = o.v === kind;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => setKind(o.v)}
            className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                        ${
                          active
                            ? "text-white"
                            : "text-[#325082] hover:text-[#22365a]"
                        }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Public profile listings only
 * Props: { listingsPlain, userId }
 */
export default function PublicProfileKindClient({
  listingsPlain = [],
  userId,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preserve "kind" state in URL
  const initialKind = ["BUY_SELL", "DONATION"].includes(
    searchParams.get("kind"),
  )
    ? searchParams.get("kind")
    : "BUY_SELL";
  const [kind, setKind] = useState(initialKind);

  function handleKindChange(newKind) {
    setKind(newKind);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("kind", newKind);
    router.replace(`/profile/${userId}?${sp.toString()}`, { scroll: false });
  }

  // Keep state synced when Back/Forward changes query
  useEffect(() => {
    const newKind = searchParams.get("kind");
    if (["BUY_SELL", "DONATION"].includes(newKind) && newKind !== kind) {
      setKind(newKind);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDonation = (p) => (p?.type || "").toLowerCase() === "donation";

  const filtered = useMemo(() => {
    return listingsPlain.filter((p) =>
      kind === "DONATION" ? isDonation(p) : !isDonation(p),
    );
  }, [listingsPlain, kind]);

  const title = kind === "DONATION" ? "Donation Listings" : "Selling Items";
  const emptyText =
    kind === "DONATION"
      ? "No active donation listings."
      : "No active selling listings.";

  return (
    <>
      {/* Filter pill */}
      <div className="flex justify-end mb-4">
        <KindSwitch kind={kind} setKind={handleKindChange} />
      </div>

      {/* Listings */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold">{title}</h2>
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {filtered.slice(0, 12).map((p, i) => (
              <MyProductCard
                key={p._id || i}
                product={p}
                className="!w-full"
                variant="classic"
                isOwner={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">{emptyText}</div>
        )}
      </section>
    </>
  );
}
