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
        className={`relative flex flex-col justify-between h-[300px] ${
          isOwner
            ? "w-[240px] max-md:w-[200px]"
            : "w-[288px] h-[340px] max-[1025px]:w-[240px] max-[1025px]:h-[300px] max-[426px]:w-[208px] max-[426px]:h-[300px] max-[376px]:w-[184px] max-[376px]:h-[260px] max-[321px]:w-[154px] max-[321px]:h-[230px]"
        } ${
          isHidden ? "bg-gray-200 opacity-60" : "bg-[#e2e2e2]"
        } rounded-[10px] p-[10px] transition-all duration-500 cursor-pointer ${
          isOwner
            ? "hover:scale-[0.96] active:scale-[0.92]"
            : "hover:-translate-y-2 active:scale-[0.95]"
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
        <div className="relative h-[70%] bg-[#ccc] rounded-[8px] mb-[5px] overflow-hidden">
          {product.defaultImage && (
            <img
              src={product.defaultImage}
              alt={product.title}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                isHidden ? "opacity-50" : ""
              }`}
            />
          )}

          {isHidden && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <span className="text-m text-white font-semibold bg-black bg-opacity-60 px-3 py-2 rounded leading-tight">
                This post is hidden
                <br />
                to public from selling
              </span>
            </div>
          )}
        </div>

        {/* Product Text */}
        <div className="h-[30%] flex flex-col justify-center text-[13px] text-black leading-tight">
          <h4 className="m-0 font-semibold truncate">{product.title}</h4>
          <p className="m-0 text-[11px] text-[#555]">{product.category}</p>
          {product.price && (
            <p className="m-0 text-[13px] text-[#222] font-semibold">
              {Number(product.price).toLocaleString()} ฿
            </p>
          )}
          <p className="m-0 text-[11px] text-gray-600">
            {timeAgo(product.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
