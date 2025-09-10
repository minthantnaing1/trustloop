import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import timeAgo from "@/utils/timeAgo";

export default function ProductCard({
  product,
  isOwner = false,
  showHideMode = false,
  onToggleHide,
}) {
  // Correct flags
  const isHidden = Boolean(product.isHidden); // seller-controlled
  const reserved = !Boolean(product.isAvailable); // transaction-controlled

  // In your page, `newStatus` means "unhide?"
  // So if item is currently hidden -> newStatus should be true (unhide)
  // If item is visible -> newStatus should be false (hide)
  const askUnhide = product.isHidden === true;

  function handleCardClick(e) {
    if (showHideMode && isOwner && onToggleHide) {
      e.preventDefault();
      onToggleHide(product._id, askUnhide);
    }
  }

  const title = isHidden
    ? "This post is hidden. Click to make it visible again."
    : "This post is visible. Click to hide it from others.";

  return (
    <Link
      href={showHideMode && isOwner ? "#" : `/buy-sell/${product._id}`}
      title={showHideMode && isOwner ? title : product.title}
    >
      <div
        onClick={handleCardClick}
        className={`relative flex flex-col justify-between
        ${
          isOwner
            ? "w-[240px] h-[300px] max-md:w-[200px]"
            : "w-full h-[340px] max-[1025px]:h-[320px] max-[426px]:h-[280px] max-[376px]:h-[260px] max-[321px]:h-[230px]"
        }
        ${isHidden ? "bg-gray-200 opacity-60" : "bg-[#e2e2e2]"}
        rounded-[10px] p-3 transition-all duration-800 ease-in-out cursor-pointer
        ${
          isOwner
            ? "hover:scale-[0.96] active:scale-[0.92] hover:shadow-md shadow-gray-300"
            : "hover:-translate-y-2 active:scale-[0.95] shadow-md shadow-gray-400 hover:shadow-gray-500"
        }`}
      >
        {/* Hide/Unhide quick toggle in hide mode */}
        {showHideMode && isOwner && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleHide(product._id, askUnhide);
            }}
            className="absolute top-1 right-1 p-1 bg-transparent border border-gray-300 rounded-full shadow hover:bg-white z-10"
            title={title}
          >
            {isHidden ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-700" />
            ) : (
              <EyeIcon className="h-5 w-5 text-green-600" />
            )}
          </button>
        )}

        {/* Image */}
        <div className="relative h-[70%] bg-[#ccc] rounded-[8px] mb-2 overflow-hidden">
          {product.defaultImage && (
            <img
              src={product.defaultImage}
              alt={product.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                isHidden ? "opacity-50" : ""
              }`}
            />
          )}

          {/* Hidden overlay */}
          {isHidden && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-2">
              <span className="text-sm text-white font-semibold bg-black/60 px-3 py-2 rounded">
                This post is hidden
                <br />
                from public
              </span>
            </div>
          )}

          {/* Reserved badge (only when not hidden) */}
          {!isHidden && reserved && (
            <span className="absolute top-2 left-2 text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Reserved
            </span>
          )}
        </div>

        {/* Info */}
        <div className="h-[30%] flex flex-col justify-center text-[14px] gap-y-1 text-black leading-tight">
          <h4 className="font-semibold truncate max-sm:text-[11px]">
            {product.title}
          </h4>
          <p className="text-[12px] text-[#555] truncate max-sm:text-[10px]">
            {product.category}
          </p>
          {product.price && (
            <p className="text-[14px] text-[#222] font-semibold max-sm:text-[11px]">
              {Number(product.price).toLocaleString()} ฿
            </p>
          )}
          <p className="text-[13px] text-gray-600 max-sm:text-[9px]">
            Posted: {timeAgo(product.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
