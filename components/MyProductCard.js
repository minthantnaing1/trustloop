// components/MyProductCard.js
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function MyProductCard({
  product,
  className = "",
  variant = "classic", // "classic" | "classicBlur"
  isOwner = false,
}) {
  const img =
    product?.defaultImage || product?.images?.[0] || "/placeholder.png";

  // Normalize type/kind
  const rawType = (product?.type || product?.kind || "")
    .toString()
    .toLowerCase();

  const isDonation = rawType === "donation";
  const isAuction = rawType === "auction";

  // ---- countdown (second-resolution) ----
  function useCountdown(targetIso) {
    const [txt, setTxt] = useState(null);

    useEffect(() => {
      if (!targetIso) return;

      const target = new Date(targetIso).getTime();

      const tick = () => {
        const ms = target - Date.now();

        if (ms <= 0) {
          setTxt("Closed");
          return;
        }

        const d = Math.floor(ms / 86_400_000);
        const h = Math.floor((ms % 86_400_000) / 3_600_000);
        const m = Math.floor((ms % 3_600_000) / 60_000);
        const s = Math.floor((ms % 60_000) / 1000);

        if (d > 0) {
          setTxt(
            `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(
              2,
              "0",
            )}m ${String(s).padStart(2, "0")}s`,
          );
        } else {
          setTxt(
            `${String(h).padStart(2, "0")}h ${String(m).padStart(
              2,
              "0",
            )}m ${String(s).padStart(2, "0")}s`,
          );
        }
      };

      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }, [targetIso]);

    return txt;
  }

  // Donation countdown
  const donationDeadlineAt = isDonation ? product?.requestDeadline : null;
  const donationDeadlineCountdown = useCountdown(donationDeadlineAt);

  // Auction countdown (support multiple possible field names safely)
  const auctionEndsAt =
    product?.auctionEndsAt ||
    product?.endsAt ||
    product?.endAt ||
    product?.auctionEndAt ||
    null;

  const auctionCountdown = useCountdown(isAuction ? auctionEndsAt : null);

  // ---- Auction price logic (defensive) ----
  const auctionCurrentBid =
    product?.currentBid ??
    product?.highestBid ??
    product?.topBid ??
    product?.currentPrice ??
    null;

  const auctionStartingBid =
    product?.startingBid ??
    product?.startBid ??
    product?.minBid ??
    product?.price ??
    null;

  const displayPrice = (() => {
    if (isDonation) {
      return product?.price != null
        ? Number(product.price) === 0
          ? "Free"
          : `${Number(product.price).toLocaleString()} ฿`
        : null;
    }

    if (isAuction) {
      const v =
        auctionCurrentBid != null
          ? Number(auctionCurrentBid)
          : auctionStartingBid != null
            ? Number(auctionStartingBid)
            : null;

      if (v == null || Number.isNaN(v)) return null;
      return `${v.toLocaleString()} ฿`;
    }

    if (product?.price == null) return null;
    return Number(product.price) === 0
      ? "Free"
      : `${Number(product.price).toLocaleString()} ฿`;
  })();

  const displayPriceLabel = isAuction
    ? auctionCurrentBid != null
      ? "Current bid"
      : "Starting bid"
    : null;

  // ------- Route rules (updated) -------
  const orderId = product?.orderId || product?.buyerOrderId;
  const status = product?.orderStatus;
  const role = product?.viewerRole; // "buyer" | "seller"

  let href;

  if (isOwner) {
    // owner routes depend on type
    href = isAuction
      ? `/auction/${product?._id}`
      : isDonation
        ? `/donation/${product?._id}`
        : `/sell/${product?._id}`;
  } else if (orderId) {
    // order routes (from profile history sections)
    if (
      role === "buyer" &&
      (status === "BUYER_CONFIRMED" || status === "PAID_OUT")
    ) {
      href = `/review/${orderId}`;
    } else if (role === "seller") {
      if (!isDonation && !isAuction && status === "PAID_OUT") {
        href = `/my-orders/${orderId}/payout`;
      } else if (isDonation && status === "BUYER_CONFIRMED") {
        href = `/my-orders/${orderId}/payout`;
      } else {
        href = `/my-orders/${orderId}`;
      }
    } else {
      href = `/my-orders/${orderId}`;
    }
  } else {
    // public/browse routes
    href = isAuction
      ? `/auction/${product?._id}`
      : isDonation
        ? `/donation/${product?._id}`
        : `/buy/${product?._id}`;
  }

  // ------- UI bits -------
  const TypePill = () => {
    const label = isAuction ? "AUCTION" : isDonation ? "DONATION" : "SELL";
    const cls = isAuction
      ? "bg-violet-600"
      : isDonation
        ? "bg-emerald-600"
        : "bg-[#325082]";

    return (
      <span
        className={`text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded text-white shadow-sm ${cls}`}
      >
        {label}
      </span>
    );
  };

  const InfoContent = () => (
    <>
      <h4 className="font-semibold truncate text-[13px] text-[#153969] max-sm:text-[12px]">
        {product?.title ?? "-"}
      </h4>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[14px] text-gray-700 truncate max-sm:text-[11px]">
          {product?.category ?? ""}
        </p>

        {displayPrice && (
          <div className="shrink-0 text-right">
            {displayPriceLabel && (
              <div className="text-[10px] md:text-[11px] text-gray-500 leading-none">
                {displayPriceLabel}
              </div>
            )}
            <p className="text-[13px] text-[#153969] font-semibold leading-tight max-sm:text-[12px]">
              {displayPrice}
            </p>
          </div>
        )}
      </div>
    </>
  );

  const TopImage = ({ className = "" }) => (
    <div className={`relative ${className}`}>
      <img
        src={img}
        alt={product?.title || "Product"}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Type pill + countdown stack */}
      <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
        <TypePill />

        {/* Donation deadline pill */}
        {variant === "classic" && isDonation && donationDeadlineCountdown && (
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 shadow ${
              donationDeadlineCountdown === "Closed"
                ? "text-gray-600"
                : "text-rose-700"
            }`}
          >
            {donationDeadlineCountdown === "Closed"
              ? "Requests closed"
              : `Ends in ${donationDeadlineCountdown}`}
          </span>
        )}

        {/* Auction countdown pill */}
        {variant === "classic" && isAuction && auctionCountdown && (
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 shadow ${
              auctionCountdown === "Closed" ? "text-gray-600" : "text-rose-700"
            }`}
          >
            {auctionCountdown === "Closed"
              ? "Auction ended"
              : `Ends in ${auctionCountdown}`}
          </span>
        )}
      </div>
    </div>
  );

  // ------- Variants -------
  if (variant === "classicBlur") {
    return (
      <Link href={href} title={product?.title} className="block">
        <div
          className={`relative flex-none snap-start flex flex-col justify-between
            w-[calc(50vw-28px)] sm:w-[220px] md:w-[240px] lg:w-[260px]
            h-[200px] sm:h-[220px]
            bg-white border border-gray-300 rounded-[2.5px] overflow-hidden
            shadow-md hover:shadow-lg transition-all duration-500 cursor-pointer
            hover:-translate-y-1 active:scale-[0.98] ${className}`}
        >
          <TopImage className="h-[70%] bg-gray-100" />

          <div className="relative h-[30%] overflow-hidden border-t border-gray-200">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(10px)",
                transform: "scale(1.15)",
              }}
            />
            <div className="absolute inset-0 bg-white/70" />
            <div className="relative h-full px-3 py-2 flex flex-col justify-center">
              <InfoContent />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} title={product?.title} className="block">
      <div
        className={`relative flex-none snap-start flex flex-col justify-between
          w-[calc(50vw-28px)] sm:w-[220px] md:w-[240px] lg:w-[260px]
          h-[200px] sm:h-[220px]
          bg-white border border-gray-300 rounded-[2.5px] overflow-hidden
          shadow-md hover:shadow-lg transition-all duration-500 cursor-pointer
          hover:-translate-y-1 active:scale-[0.98] ${className}`}
      >
        <TopImage className="h-[70%] bg-gray-100" />

        <div className="h-[30%] px-3 py-2 flex flex-col justify-center border-t border-gray-200 bg-white">
          <InfoContent />
        </div>
      </div>
    </Link>
  );
}
