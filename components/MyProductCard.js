// components/MyProductCard.js
"use client";

import Link from "next/link";
import { fmtBKK } from "@/utils/timeAgo";

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
  const deadlineTxt =
    isDonation && product?.requestDeadline
      ? fmtBKK(product.requestDeadline)
      : null;

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

      {/* Type pill for BOTH variants */}
      <div className="absolute top-1 left-1">
        <TypePill />
      </div>

      {/* Deadline shown ONLY on classic variant */}
      {variant === "classic" && isDonation && deadlineTxt && (
        <div className="absolute top-1 right-1">
          <span className="text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded bg-white/85 text-rose-700 shadow">
            Deadline: {deadlineTxt}
          </span>
        </div>
      )}
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
