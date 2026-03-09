// components/ProductCard.js
"use client";

import Link from "next/link";
import timeAgo from "@/utils/timeAgo";
import FavoriteButton from "@/components/FavoriteButton";
import { useState, useEffect } from "react";

export default function ProductCard({
  product,
  isOwner = false,
  variant = "classic", // "classic" | "classicBlur" | "overlay"
  className = "",
  showFavToggle = false,
  initialIsFav,
  currentUserEmail,
}) {
  const isHidden = Boolean(product.isHidden);
  const isAuction = product?.type === "auction";
  const isDonation = product?.type === "donation";

  // sell / donation use isAvailable
  const reserved = !isAuction && !Boolean(product.isAvailable);

  const isMe =
    !!product.buyerEmail &&
    !!currentUserEmail &&
    product.buyerEmail === currentUserEmail;

  function useCountdown(targetIso) {
    const [txt, setTxt] = useState(null);

    useEffect(() => {
      if (!targetIso) {
        setTxt(null);
        return;
      }

      const target = new Date(targetIso).getTime();
      if (Number.isNaN(target)) {
        setTxt(null);
        return;
      }

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

  const donationAccepted = isDonation && Boolean(product?.acceptedBy);

  const donationDeadlineAt =
    isDonation && !donationAccepted ? product?.requestDeadline : null;

  const donationDeadlineCountdown = useCountdown(donationDeadlineAt);

  const auctionEndsAt = isAuction ? product?.auctionEndsAt : null;
  const auctionCountdown = useCountdown(auctionEndsAt);
  const auctionClosed =
    isAuction &&
    (auctionCountdown === "Closed" || product?.auctionStatus !== "OPEN");

  const earlyStatuses = new Set(["PENDING_PAYMENT", "PAYMENT_SUCCESSFUL"]);

  let orderHref = null;
  if (!isAuction && reserved && product.buyerOrderId) {
    const status = product?.buyerOrderStatus;

    if (isOwner) {
      if (status && earlyStatuses.has(status)) {
        orderHref = "/my-orders?role=seller";
      } else if (status === "PAID_OUT") {
        orderHref = `/my-orders/${product.buyerOrderId}/payout`;
      } else {
        orderHref = `/my-orders/${product.buyerOrderId}`;
      }
    } else if (isMe) {
      if (status === "BUYER_CONFIRMED" || status === "PAID_OUT") {
        orderHref = `/review/${product.buyerOrderId}`;
      } else {
        orderHref = `/my-orders/${product.buyerOrderId}`;
      }
    }
  }

  const typeHref = isAuction
    ? `/auction/${product._id}`
    : isDonation
      ? `/donation/${product._id}`
      : isOwner
        ? `/sell/${product._id}`
        : `/buy/${product._id}`;

  const href = orderHref ?? typeHref;
  const img = product.defaultImage || "/placeholder.png";

  const displayPrice = (() => {
    if (isDonation) {
      return product.price != null
        ? Number(product.price) === 0
          ? "Free"
          : `${Number(product.price).toLocaleString()} ฿`
        : null;
    }

    if (isAuction) {
      if (product.startingPrice == null) return null;
      return `${Number(product.startingPrice).toLocaleString()} ฿`;
    }

    if (product.price == null) return null;
    return Number(product.price) === 0
      ? "Free"
      : `${Number(product.price).toLocaleString()} ฿`;
  })();

  const displayPriceLabel = isAuction ? "Starting price" : null;

  const Badges = () => {
    if (isHidden) {
      return (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="w-full text-center text-xs md:text-sm text-white font-semibold bg-black/60 px-1 py-2">
            Hidden from Public
          </span>
        </div>
      );
    }

    if (isAuction) {
      if (!auctionClosed) return null;

      const endedText =
        product?.auctionStatus === "SOLD"
          ? "Auction sold"
          : product?.auctionStatus === "CANCELLED"
            ? "Auction cancelled"
            : "Auction ended";

      return (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="w-full text-center text-xs md:text-sm text-white font-semibold bg-black/60 px-1 py-2">
            {endedText}
          </span>
        </div>
      );
    }

    if (!reserved) return null;

    const buyerFinal = isDonation
      ? product?.buyerOrderStatus === "BUYER_CONFIRMED"
      : product?.buyerOrderStatus === "BUYER_CONFIRMED" ||
        product?.buyerOrderStatus === "PAID_OUT";

    const ownerFinal = isDonation
      ? product?.buyerOrderStatus === "BUYER_CONFIRMED"
      : product?.buyerOrderStatus === "PAID_OUT";

    const iAmBuyer =
      product?.buyerEmail &&
      currentUserEmail &&
      product.buyerEmail === currentUserEmail;

    if (isOwner && product?.buyerName) {
      return (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span
            className={`w-full text-center text-xs md:text-sm text-white font-semibold px-1 py-2 ${
              ownerFinal ? "bg-emerald-700/90" : "bg-[#325082]/90"
            }`}
          >
            {ownerFinal
              ? `${isDonation ? "Donated to" : "Sold to"} ${product.buyerName}`
              : `Reserved by ${product.buyerName}`}
          </span>
        </div>
      );
    }

    if (iAmBuyer) {
      return (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span
            className={`w-full text-center text-xs md:text-sm text-white font-semibold px-1 py-2 ${
              buyerFinal ? "bg-emerald-700/90" : "bg-[#325082]/90"
            }`}
          >
            {buyerFinal
              ? isDonation
                ? "Received by Me"
                : "Purchased by Me"
              : "Reserved by Me"}
          </span>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <span className="w-full text-center text-xs md:text-sm text-white font-semibold bg-black/60 px-1 py-2">
          {buyerFinal
            ? isDonation
              ? "Donated"
              : "Sold"
            : "This item is currently reserved or unavailable."}
        </span>
      </div>
    );
  };

  const InfoContent = () => (
    <>
      <h4 className="font-semibold truncate text-[12.5px] text-[#153969] md:text-[15px]">
        {product.title}
      </h4>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[12px] md:text-[13px] text-gray-700 truncate">
          {product.category}
        </p>

        {displayPrice && (
          <div className="shrink-0 text-right">
            {displayPriceLabel && (
              <div className="text-[10px] md:text-[11px] text-gray-500 leading-none">
                {displayPriceLabel}
              </div>
            )}
            <p className="text-[12.5px] md:text-[15px] text-[#153969] font-semibold leading-tight">
              {displayPrice}
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] md:text-[12px] text-gray-600">
        {product.createdAt ? timeAgo(product.createdAt) : ""}
      </p>
    </>
  );

  const TopImage = ({ className = "" }) => (
    <div className={`relative ${className}`}>
      <img
        src={img}
        alt={product.title}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isHidden ? "opacity-50" : "opacity-100"
        }`}
      />

      {variant !== "overlay" && isDonation && donationDeadlineCountdown && (
        <div className="absolute top-1 right-1">
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
              donationDeadlineCountdown === "Closed"
                ? "text-gray-600"
                : "text-rose-700"
            }`}
          >
            {donationDeadlineCountdown === "Closed"
              ? "Requests closed"
              : `Ends in ${donationDeadlineCountdown}`}
          </span>
        </div>
      )}

      {variant !== "overlay" && isAuction && auctionCountdown && (
        <div className="absolute top-1 right-1">
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
              auctionClosed ? "text-gray-600" : "text-rose-700"
            }`}
          >
            {auctionClosed ? "Auction ended" : `Ends in ${auctionCountdown}`}
          </span>
        </div>
      )}

      <Badges />
    </div>
  );

  const FavOverlay = () =>
    !showFavToggle ? null : (
      <FavoriteButton
        productId={product._id?.toString()}
        initialIsFav={initialIsFav}
        variant="icon"
        stopNavigation
      />
    );

  const TypePill = () => {
    const label = isAuction ? "AUCTION" : isDonation ? "DONATION" : "SELL";
    const cls = isAuction
      ? "bg-violet-600"
      : isDonation
        ? "bg-emerald-600"
        : "bg-[#325082]";

    return (
      <span
        className={`text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded text-white ${cls}`}
      >
        {label}
      </span>
    );
  };

  if (variant === "overlay") {
    return (
      <Link href={href} title={product.title} className={className}>
        <div
          className={`relative w-full h-[280px] max-[1025px]:h-[260px] max-[426px]:h-[230px] max-[376px]:h-[210px]
          overflow-hidden cursor-pointer bg-white border border-gray-300 rounded-[2.5px] hover:ring-[#cfd8ff]
          shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-500 ease-in-out`}
        >
          <FavOverlay />

          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-center bg-cover scale-110 blur-sm"
              style={{ backgroundImage: `url(${img})` }}
            />
            <div
              className="absolute inset-0 bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "contain",
              }}
            />

            <Badges />

            <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
              <TypePill />

              {isDonation && donationDeadlineCountdown && (
                <span
                  className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
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

              {isAuction && auctionCountdown && (
                <span
                  className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
                    auctionClosed ? "text-gray-600" : "text-rose-700"
                  }`}
                >
                  {auctionClosed
                    ? "Auction ended"
                    : `Ends in ${auctionCountdown}`}
                </span>
              )}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(4px)",
                transform: "scale(1.15)",
              }}
            />
            <div className="absolute inset-0 bg-white/70" />
            <div className="relative px-3 py-2">
              <InfoContent />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "classicBlur") {
    return (
      <Link href={href} title={product.title} className={className}>
        <div
          className={`relative flex flex-col w-full 
          h-[300px] max-[1025px]:h-[270px] max-[426px]:h-[255px] max-[376px]:h-[250px] 
          bg-white border border-gray-300 rounded-[2.5px] cursor-pointer overflow-hidden
          shadow-lg hover:shadow-lg transition-all duration-500 ease-in-out
          ${isOwner ? "hover:scale-[0.98]" : "hover:-translate-y-1"}`}
        >
          <FavOverlay />
          <TopImage className="h-[70%] bg-gray-100" />

          <div className="relative h-[30%] overflow-hidden border-t border-gray-200">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(7px)",
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
    <Link href={href} title={product.title} className={className}>
      <div
        className={`relative flex flex-col w-full 
        h-[300px] max-[1025px]:h-[270px] max-[426px]:h-[255px] max-[376px]:h-[250px] 
        bg-white border border-gray-300 rounded-[2.5px] cursor-pointer overflow-hidden
        shadow-lg hover:shadow-lg transition-all duration-500 ease-in-out
        ${isOwner ? "hover:scale-[0.98]" : "hover:-translate-y-1"}`}
      >
        <FavOverlay />
        <TopImage className="h-[70%] bg-gray-100" />

        <div className="h-[30%] px-3 py-2 flex flex-col justify-center border-t border-gray-200 bg-white">
          <InfoContent />
        </div>
      </div>
    </Link>
  );
}
