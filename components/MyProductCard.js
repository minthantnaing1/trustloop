// components/MyProductCard.js
"use client";

import Link from "next/link";
import { fmtBKK } from "@/utils/timeAgo";
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

  const deadlineAt = isDonation ? product?.requestDeadline : null;
  const deadlineCountdown = useCountdown(deadlineAt);

  // ------- Route rules (updated) -------
  const orderId = product?.orderId || product?.buyerOrderId;
  const status = product?.orderStatus;
  const role = product?.viewerRole; // "buyer" | "seller"

  let href;
  if (isOwner) {
    // owner: donation → donation page, otherwise the normal sell page
    href = isDonation ? `/donation/${product?._id}` : `/sell/${product?._id}`;
  } else if (orderId) {
    // role-aware order routes
    if (
      role === "buyer" &&
      (status === "BUYER_CONFIRMED" || status === "PAID_OUT")
    ) {
      // final review page (keep your existing review route)
      href = `/review/${orderId}`;
    } else if (role === "seller") {
      // seller (donor/seller) final page:
      // - Buy&Sell: PAID_OUT -> payout
      // - Donation: BUYER_CONFIRMED -> donor summary/review (same payout page variant)
      if (!isDonation && status === "PAID_OUT") {
        href = `/my-orders/${orderId}/payout`;
      } else if (isDonation && status === "BUYER_CONFIRMED") {
        href = `/my-orders/${orderId}/payout`;
      } else {
        href = `/my-orders/${orderId}`;
      }
    } else {
      // any other order state
      href = `/my-orders/${orderId}`;
    }
  } else {
    // browse routes
    href = isDonation ? `/donation/${product?._id}` : `/buy/${product?._id}`;
  }

  // ------- Shared bits -------
  const TypePill = () => (
    <span className="text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-sm">
      {isDonation ? "DONATION" : "SELL"}
    </span>
  );

  const InfoContent = () => (
    <>
      <h4 className="font-semibold truncate text-[13px] text-[#153969] max-sm:text-[12px]">
        {product?.title ?? "-"}
      </h4>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[14px] text-gray-700 truncate max-sm:text-[11px]">
          {product?.category ?? ""}
        </p>

        {product?.price != null && (
          <p className="text-[13px] text-[#153969] font-semibold shrink-0 max-sm:text-[12px]">
            {Number(product.price) === 0
              ? "Free"
              : `${Number(product.price).toLocaleString()} ฿`}
          </p>
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

      {/* Type pill and Deadline stacked vertically */}
      <div className="absolute top-1 left-1 flex flex-col gap-1 items-start">
        <TypePill />
        {variant === "classic" && isDonation && deadlineCountdown && (
          <span
            className={`text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 shadow ${
              deadlineCountdown === "Closed" ? "text-gray-600" : "text-rose-700"
            }`}
          >
            {deadlineCountdown === "Closed"
              ? "Requests closed"
              : `Ends in ${deadlineCountdown}`}
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
          {/* Image */}
          <TopImage className="h-[70%] bg-gray-100" />

          {/* Blurred info bar */}
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

  // classic
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
        {/* Image */}
        <TopImage className="h-[70%] bg-gray-100" />

        {/* Info */}
        <div className="h-[30%] px-3 py-2 flex flex-col justify-center border-t border-gray-200 bg-white">
          <InfoContent />
        </div>
      </div>
    </Link>
  );
}
