import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import timeAgo from "@/utils/timeAgo";

export default function ProductCard({
  product,
  isOwner = false,
  showHideMode = false,
  onToggleHide,
}) {
  const isHidden = !product.isAvailable;

  const handleClick = (e) => {
    if (showHideMode && isOwner && onToggleHide) {
      e.preventDefault();
      onToggleHide(product._id, !product.isAvailable);
    }
  };

  const title = isHidden
    ? "This post is currently hidden. Click to make it visible again."
    : "This post is currently visible. Click to hide it from others.";

  return (
    <Link
      href={showHideMode && isOwner ? "#" : `/buy-sell/${product._id}`}
      title={showHideMode && isOwner ? title : product.title}
    >
      <div
        onClick={handleClick}
        className={`relative flex flex-col justify-between h-[300px] min-w-[240px] ${
          isHidden ? "bg-gray-200 opacity-60" : "bg-[#e2e2e2]"
        } rounded-[10px] p-[10px] transition-all duration-500 linear will-change-transform cursor-pointer ${
          isOwner
            ? "hover:scale-[0.96] active:scale-[0.92] hover:brightness-105 hover:shadow-md hover:shadow-gray-400"
            : "hover:-translate-y-2 active:scale-[0.95] hover:shadow-lg hover:shadow-gray-400"
        }`}
      >
        {/* Eye toggle button for owner in hide mode */}
        {showHideMode && isOwner && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleHide(product._id, !product.isAvailable);
            }}
            className="absolute top-1 right-1 p-1 bg-transparent border-[1.5px] border-gray-300 rounded-full shadow-lg hover:bg-white z-10"
            title={title}
          >
            {isHidden ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-700" />
            ) : (
              <EyeIcon className="h-5 w-5 text-green-600" />
            )}
          </button>
        )}

        {/* Product Image Container */}
        <div className="relative h-[200px] bg-[#ccc] rounded-[8px] mb-[10px]">
          {isHidden && (
            <div className="absolute inset-0 bg-gray-400 bg-opacity-30 flex items-center justify-center rounded-[8px]">
              <span className="text-m text-white font-semibold">
                This post is hidden
              </span>
            </div>
          )}
        </div>

        {/* Product Text */}
        <div className="px-[6px] py-[4px] text-[14px] text-black">
          <h4 className="m-0 font-semibold truncate">{product.title}</h4>
          <p className="m-0 text-[12px] text-[#555]">{product.category}</p>
          {product.price && (
            <p className="m-0 text-[14px] text-[#222] font-semibold mt-1">
              {Number(product.price).toLocaleString()} ฿
            </p>
          )}
          <p className="m-0 text-[13px] text-gray-600 mt-1">
            Posted: {timeAgo(product.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
