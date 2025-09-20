// components/MyProductCard.js
"use client";

import Link from "next/link";

export default function MyProductCard({
  product,
  className = "",
  variant = "classic", // "classic" | "classicBlur"
  isOwner = false,
}) {
  const img =
    product?.defaultImage || product?.images?.[0] || "/placeholder.png";

  // Route rules:
  let href;
  if (isOwner) {
    href = `/sell/${product?._id}`;
  } else {
    const orderId = product?.orderId || product?.buyerOrderId;
    const status = product?.orderStatus;
    const role = product?.viewerRole; // "buyer" | "seller"

    if (
      orderId &&
      role === "buyer" &&
      (status === "BUYER_CONFIRMED" || status === "PAID_OUT")
    ) {
      href = `/buy/review/${orderId}`;
    } else if (orderId && role === "seller" && status === "PAID_OUT") {
      href = `/my-orders/${orderId}/payout`;
    } else if (orderId) {
      href = `/my-orders/${orderId}`;
    } else {
      href = `/buy/${product?._id}`;
    }
  }

  // --- shared bits -----------------------------------------------------------

  const InfoContent = () => (
    <>
      <h4 className="font-semibold truncate text-[14px] max-sm:text-[12px]">
        {product?.title ?? "-"}
      </h4>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[12px] text-gray-700 truncate max-sm:text-[11px]">
          {product?.category ?? ""}
        </p>
        {product?.price != null && (
          <p className="text-[14px] font-semibold shrink-0 max-sm:text-[12px]">
            {Number(product.price).toLocaleString()} ฿
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
    </div>
  );

  // --- variants --------------------------------------------------------------

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
