"use client";

import Link from "next/link";
import timeAgo, { fmtBKK } from "@/utils/timeAgo";
import FavoriteButton from "@/components/FavoriteButton";
import { useState, useEffect } from "react";

export default function ProductCard({
  product,
  isOwner = false,
  variant = "classic", // "classic" | "classicBlur" | "overlay"
  className = "",
  showFavToggle = false, // show a heart in the top-right and seed its state
  initialIsFav, // can be true/false/undefined
  currentUserEmail,
}) {
  const isHidden = Boolean(product.isHidden);
  const reserved = !Boolean(product.isAvailable);
  const isMe =
    !!product.buyerEmail &&
    !!currentUserEmail &&
    product.buyerEmail === currentUserEmail;

  // ---- countdown (minute-resolution) ----
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

        const d = Math.floor(ms / 86_400_000); // days
        const h = Math.floor((ms % 86_400_000) / 3_600_000); // hours
        const m = Math.floor((ms % 3_600_000) / 60_000); // minutes
        const s = Math.floor((ms % 60_000) / 1000); // seconds

        // Format like "2d 03h 45m 22s" or "03h 45m 22s"
        if (d > 0) {
          setTxt(
            `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(
              2,
              "0"
            )}m ${String(s).padStart(2, "0")}s`
          );
        } else {
          setTxt(
            `${String(h).padStart(2, "0")}h ${String(m).padStart(
              2,
              "0"
            )}m ${String(s).padStart(2, "0")}s`
          );
        }
      };

      tick();
      const id = setInterval(tick, 1000); // update every second

      return () => clearInterval(id);
    }, [targetIso]);

    return txt;
  }

  const isDonation = product?.type === "donation";
  const deadlineAt = isDonation ? product?.requestDeadline : null;
  const deadlineCountdown = useCountdown(deadlineAt);

  // Seller should be sent to the Seller tab (not order detail) while the order
  // is in an early state. After that, go to order detail.
  const earlyStatuses = new Set([
    "PENDING_UPLOAD",
    "AWAITING_ADMIN_REVIEW",
    "ESCROW_FUNDED",
  ]);

  let orderHref = null;
  if (reserved && product.buyerOrderId) {
    const status = product?.buyerOrderStatus;

    if (isOwner) {
      // Seller: before accepting, redirect to My Orders (Seller tab).
      if (status && earlyStatuses.has(status)) {
        orderHref =
          status === "ESCROW_FUNDED"
            ? "/my-orders?role=seller&status=ESCROW_FUNDED"
            : "/my-orders?role=seller";
      } else if (status === "PAID_OUT") {
        // Seller, final payout view
        orderHref = `/my-orders/${product.buyerOrderId}/payout`;
      } else {
        // After early states, go to order detail
        orderHref = `/my-orders/${product.buyerOrderId}`;
      }
    } else if (isMe) {
      // Buyer routes
      if (status === "BUYER_CONFIRMED" || status === "PAID_OUT") {
        // Buyer final review page
        orderHref = `/review/${product.buyerOrderId}`;
      } else {
        // Buyer ongoing order
        orderHref = `/my-orders/${product.buyerOrderId}`;
      }
    }
  }

  // Routing tweak: donations go to donation detail page
  const typeHref = isDonation
    ? `/donation/${product._id}`
    : isOwner
    ? `/sell/${product._id}`
    : `/buy/${product._id}`;

  const href = orderHref ?? typeHref;

  const img = product.defaultImage || "/placeholder.png";

  // --- Shared subparts -------------------------------------------------------

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

    if (!reserved) return null;

    const isDonation = product?.type === "donation";

    // ---- Final status logic (owner vs buyer/public) ----
    const buyerFinal = isDonation
      ? product?.buyerOrderStatus === "BUYER_CONFIRMED"
      : product?.buyerOrderStatus === "BUYER_CONFIRMED" ||
        product?.buyerOrderStatus === "PAID_OUT";

    const ownerFinal = isDonation
      ? product?.buyerOrderStatus === "BUYER_CONFIRMED"
      : product?.buyerOrderStatus === "PAID_OUT";

    // keep your preferred naming
    const iAmBuyer =
      product?.buyerEmail &&
      currentUserEmail &&
      product.buyerEmail === currentUserEmail;

    // ---- Owner view ----
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

    // ---- Buyer / public view ----
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

    // ---- Everyone else ----
    return (
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <span className="w-full text-center text-xs md:text-sm text-white font-semibold bg-black/60 px-1 py-2">
          {buyerFinal
            ? isDonation
              ? "Donated"
              : "Sold"
            : "This Item is currently Reserved or Unavailable."}
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
        {product.price != null && (
          <p className="text-[12.5px] md:text-[15px] text-[#153969] font-semibold shrink-0">
            {Number(product.price) === 0
              ? "Free"
              : `${Number(product.price).toLocaleString()} ฿`}
          </p>
        )}
      </div>

      {/* created time */}
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

      {/* For classic/classicBlur: no type pill; deadline at top-right */}
      {variant !== "overlay" && isDonation && deadlineCountdown && (
        <div className="absolute top-1 right-1">
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
              deadlineCountdown === "Closed" ? "text-gray-600" : "text-rose-700"
            }`}
          >
            {deadlineCountdown === "Closed"
              ? "Requests closed"
              : `Ends in ${deadlineCountdown}`}
          </span>
        </div>
      )}

      <Badges />
    </div>
  );

  // 💙 tiny favorite toggle overlay (let the button handle positioning)
  const FavOverlay = () =>
    !showFavToggle ? null : (
      <FavoriteButton
        productId={product._id?.toString()}
        initialIsFav={initialIsFav}
        variant="icon"
        stopNavigation
      />
    );

  // --- Variants --------------------------------------------------------------

  if (variant === "overlay") {
    return (
      <Link href={href} title={product.title} className={className}>
        <div
          className={`relative w-full h-[280px] max-[1025px]:h-[260px] max-[426px]:h-[230px] max-[376px]:h-[210px]
          overflow-hidden cursor-pointer bg-white border border-gray-300 rounded-[2.5px] hover:ring-[#cfd8ff]
          shadow-md hover:scale-[1.02] hover:shadow-lg transition-all duration-500 easse-in-out`}
        >
          <FavOverlay />

          {/* Image fills card, shows FULL image; edges filled with blurred cover */}
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
            {/* Type and deadline (moved from TopImage, since overlay doesn’t call it) */}
            <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
              <span className="text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-600 text-white">
                {isDonation ? "DONATION" : "SELL"}
              </span>
              {isDonation && deadlineCountdown && (
                <span
                  className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 ${
                    deadlineCountdown === "Closed"
                      ? "text-gray-600"
                      : "text-rose-700"
                  }`}
                >
                  {deadlineCountdown === "Closed"
                    ? "Requests closed"
                    : `Ends in ${deadlineCountdown}`}
                </span>
              )}
            </div>
          </div>

          {/* Info bar (blurred image + white scrim) */}
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

  // classic
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
