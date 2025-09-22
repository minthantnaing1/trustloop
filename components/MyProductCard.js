"use client";

import Link from "next/link";

export default function MyProductCard({ product, className = "" }) {
  const img =
    product?.defaultImage || product?.images?.[0] || "/placeholder.png";

  return (
    <Link
      href={`/buy-sell/${product._id}`}
      title={product.title}
      className="block"
    >
      <div
        className={`relative flex-none snap-start flex flex-col justify-between
          /* 👇 width: two-up on mobile, fixed on larger screens */
          w-[calc(50vw-28px)] sm:w-[220px] md:w-[240px] lg:w-[260px]
          h-[250px] sm:h-[260px]
          bg-[#e2e2e2] rounded-[10px] p-3
          transition-all duration-500 cursor-pointer
          hover:-translate-y-2 active:scale-[0.95]
          shadow-md shadow-gray-400 hover:shadow-gray-500 ${className}`}
      >
        {/* Image block */}
        <div className="relative h-[70%] bg-[#ccc] rounded-[8px] mb-2 overflow-hidden">
          <img
            src={img}
            alt={product.title}
            className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
          />
        </div>

        {/* Text block */}
        <div className="h-[30%] flex flex-col justify-center text-[14px] gap-y-1 text-black leading-tight">
          <h4 className="font-semibold truncate max-sm:text-[11px]">
            {product.title}
          </h4>

          {product?.category ? (
            <p className="text-[12px] text-[#555] truncate max-sm:text-[10px]">
              {product.category}
            </p>
          ) : null}

          {product?.price === 0 ? (
            <p className="text-[14px] text-green-600 font-bold max-sm:text-[11px]">
              Free
            </p>
            
          ) : 

          product?.price != null ? (
            <p className="text-[14px] text-[#222] font-semibold max-sm:text-[11px]">
              {Number(product.price).toLocaleString()} ฿
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
