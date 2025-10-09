// components/profile/ProfileKindClient.jsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MyProductCard from "@/components/MyProductCard";

/* compact Kind pill (same feel as My Orders) */
function KindSwitch({ kind, setKind }) {
  const options = [
    { v: "BUY_SELL", label: "Buy/Sell" },
    { v: "DONATION", label: "Donation" },
    // { v: "AUCTION", label: "Auction" }, // for later
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
 * Props: { sellingPlain, boughtProducts, soldProducts }
 * All arrays are already serialized by the server page.
 */
export default function ProfileKindClient({
  sellingPlain = [],
  boughtProducts = [],
  soldProducts = [],
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Preserve "kind" state in URL
  const initialKind = ["BUY_SELL", "DONATION"].includes(
    searchParams.get("kind")
  )
    ? searchParams.get("kind")
    : "BUY_SELL";
  const [kind, setKind] = useState(initialKind);

  function handleKindChange(newKind) {
    setKind(newKind);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("kind", newKind);
    router.replace(`/profile?${sp.toString()}`, { scroll: false });
  }

  // Keep state synced when user presses browser Back/Forward
  useEffect(() => {
    const newKind = searchParams.get("kind");
    if (["BUY_SELL", "DONATION"].includes(newKind) && newKind !== kind) {
      setKind(newKind);
    }
  }, [searchParams]);

  // ---------------- Filters ----------------
  const isDonation = (p) => (p?.type || "").toLowerCase() === "donation";

  const sellFiltered = useMemo(
    () =>
      sellingPlain.filter((p) =>
        kind === "DONATION" ? isDonation(p) : !isDonation(p)
      ),
    [sellingPlain, kind]
  );

  const boughtFiltered = useMemo(
    () =>
      boughtProducts.filter((p) =>
        kind === "DONATION" ? isDonation(p) : !isDonation(p)
      ),
    [boughtProducts, kind]
  );

  // ✅ FIX: show correct sold items depending on kind
  const soldFiltered = useMemo(() => {
    return soldProducts.filter((p) => {
      const donation = isDonation(p);
      if (kind === "DONATION") {
        return donation && p.orderStatus === "BUYER_CONFIRMED";
      } else {
        return !donation && p.orderStatus === "PAID_OUT";
      }
    });
  }, [soldProducts, kind]);

  // ---------------- Labels & Routes ----------------
  const labels = {
    boughtTitle:
      kind === "DONATION" ? "My Received Donations" : "My Bought Items",
    sellingTitle:
      kind === "DONATION" ? "My Donation Listings" : "My Selling Items",
    soldTitle: kind === "DONATION" ? "My Donated Items" : "My Sold Items",
    boughtEmpty:
      kind === "DONATION"
        ? "No received donations yet."
        : "No completed purchases yet.",
    sellingEmpty:
      kind === "DONATION"
        ? "No active donation listings."
        : "No active listings.",
    soldEmpty:
      kind === "DONATION" ? "No donated items yet." : "No completed sales yet.",
  };

  const viewAllBoughtHref =
    kind === "DONATION"
      ? "/my-orders?role=buyer&status=BUYER_CONFIRMED&kind=DONATION"
      : "/my-orders?role=buyer&status=BUYER_CONFIRMED&kind=BUY_SELL";

  const manageListingsHref = kind === "DONATION" ? "/donation" : "/sell";

  const viewAllSoldHref =
    kind === "DONATION"
      ? "/my-orders?role=seller&status=BUYER_CONFIRMED&kind=DONATION"
      : "/my-orders?role=seller&status=PAID_OUT&kind=BUY_SELL";

  // ---------------- Render ----------------
  return (
    <>
      {/* Filter pill */}
      <div className="flex justify-end mb-4">
        <KindSwitch kind={kind} setKind={handleKindChange} />
      </div>

      {/* Content */}
      <div
        key={kind}
        className="transition-all duration-[800ms]"
        style={{ animation: "fadeSlide 800ms ease-out" }}
      >
        {/* Bought / Received */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">{labels.boughtTitle}</h2>
            <Link
              href={viewAllBoughtHref}
              className="text-[#325082] underline text-sm"
            >
              View all...
            </Link>
          </div>

          {boughtFiltered.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {boughtFiltered.slice(0, 8).map((p, i) => (
                <MyProductCard
                  key={p._id || i}
                  product={p}
                  className="!w-full"
                  variant="classicBlur"
                  isOwner={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">{labels.boughtEmpty}</p>
          )}
        </section>

        {/* Selling / Donation Listings */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">{labels.sellingTitle}</h2>
            <Link
              href={manageListingsHref}
              className="text-[#325082] underline text-sm"
            >
              {kind === "DONATION" ? "Manage donations" : "Manage listings"}
            </Link>
          </div>

          {sellFiltered.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {sellFiltered.slice(0, 8).map((p, i) => (
                <MyProductCard
                  key={p._id || i}
                  product={p}
                  className="!w-full"
                  variant="classic"
                  isOwner
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">{labels.sellingEmpty}</div>
          )}
        </section>

        {/* Sold / Donated */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold">{labels.soldTitle}</h2>
            <Link
              href={viewAllSoldHref}
              className="text-[#325082] underline text-sm"
            >
              View all...
            </Link>
          </div>

          {soldFiltered.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {soldFiltered.slice(0, 8).map((p, i) => (
                <MyProductCard
                  key={p._id || i}
                  product={p}
                  className="!w-full"
                  variant="classicBlur"
                  isOwner={false}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">{labels.soldEmpty}</p>
          )}
        </section>
      </div>
    </>
  );
}
