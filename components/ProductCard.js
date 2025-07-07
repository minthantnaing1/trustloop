import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function ProductCard({
  product,
  isOwner = false,
  showHideMode = false,
  onToggleHide,
}) {
  const isHidden = !product.isAvailable;

  return (
    <div
      className={`relative flex flex-col justify-end h-[300px] min-w-[240px] ${
        isHidden ? "bg-gray-300 opacity-50" : "bg-[#e2e2e2]"
      } rounded-[10px] p-[10px] transition hover:shadow-md`}
    >
      {/* Toggle hide/unhide button */}
      {showHideMode && isOwner && (
        <button
          onClick={() => onToggleHide(product._id, !product.isAvailable)}
          className="absolute top-2 right-2 p-1 bg-white border border-gray-400 rounded-full hover:bg-gray-100"
          title={isHidden ? "Unhide" : "Hide"}
        >
          {isHidden ? (
            <EyeSlashIcon className="h-5 w-5 text-green-600" />
          ) : (
            <EyeIcon className="h-5 w-5 text-yellow-600" />
          )}
        </button>
      )}

      {/* Product Info */}
      <Link href={`/buy-sell/${product._id}`} className="flex flex-col flex-1">
        <div className="h-[90%] bg-[#ccc] rounded-[8px] mb-[10px]" />
        <div className="px-[6px] py-[4px] text-[14px] text-black">
          <h4 className="m-0 font-semibold">{product.title}</h4>
          <p className="m-0 text-[12px] text-[#555]">{product.category}</p>
          {product.price && (
            <p className="m-0 text-[14px] text-[#222] font-semibold mt-1">
              {Number(product.price).toLocaleString()} ฿
            </p>
          )}
        </div>
      </Link>

      {!isHidden && (
        <button className="w-full bg-[#325082] text-white text-[12px] py-[6px] px-[8px] rounded-[6px] hover:opacity-90">
          Add To Cart
        </button>
      )}

      {isHidden && (
        <div className="text-center text-[12px] text-red-600 font-semibold mt-2">
          This post is hidden
        </div>
      )}
    </div>
  );
}
