// components/ProductDetails.js
"use client";

import NavBar from "@/components/NavBar";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import ProductDeleteButton from "@/components/ProductDeleteButton";
import ProductImages from "@/components/ProductImages";
import CommentSection from "@/components/CommentSection";
import FavoriteButton from "@/components/FavoriteButton";
import HideToggleButton from "@/components/HideToggleButton";
import BackButton from "@/components/BackButton";
import { PencilIcon } from "@heroicons/react/24/solid";
import MaskedUserId from "@/components/MaskedUserId";
import BuyRequestGuard from "@/components/BuyRequestGuard";

export default function ProductDetails({
  product,
  sessionEmail,
  initialIsFav,
  isOwner,
  guard,
}) {
  const canBuyerInteract = !isOwner && product.isAvailable === true;
  const canSellerManage = isOwner && product.isAvailable === true;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        {/* Top Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-2">
          {/* Left: Back Button (always left) */}
          <BackButton />

          {/* Right: Owner Actions */}
          {isOwner && canSellerManage && (
            <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto self-end sm:self-auto sm:ml-auto justify-end flex-wrap">
              <HideToggleButton
                productId={product._id}
                initialHidden={product.isHidden}
              />

              <Link href={`/sell/${product._id}/edit`}>
                <ActionButton
                  text="Edit"
                  variant="outlineHover"
                  icon={<PencilIcon className="w-4.5 h-4.5" />}
                />
              </Link>

              <ProductDeleteButton productId={product._id} type="sell" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex gap-[30px] flex-col sm:flex-row">
          {/* Left: Product Images */}
          <ProductImages
            images={product.images}
            defaultImage={product.defaultImage}
          />

          {/* Right: Product Info */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <div className="text-gray-700">
              Category:{" "}
              <span className="font-semibold">{product.category || "-"}</span>
            </div>
            <p className="text-lg font-semibold">
              {Number(product.price).toLocaleString()} ฿
            </p>

            {/* Buyer action buttons */}
            <div className="flex flex-wrap justify-center gap-2 w-full h-full">
              {canBuyerInteract && (
                <>
                  <div className="flex-5 sm:flex-9 w-full">
                    <BuyRequestGuard
                      href={`/buy/${product._id}/checkout`}
                      guard={guard}
                      text="🏷️ Buy Now"
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1">
                    <FavoriteButton
                      productId={product._id?.toString()}
                      initialIsFav={Boolean(product.isFav ?? initialIsFav)}
                      className="w-full h-full"
                    />
                  </div>
                </>
              )}
            </div>

            {/* {!product.isAvailable && (
              <p className="text-sm text-gray-600 mt-1">
                This item is currently in an active transaction or sold out.
              </p>
            )} */}

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description:{" "}
              <span className="font-semibold">
                {product.description || "-"}
              </span>
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Condition:{" "}
              <span className="font-semibold">{product.condition || "-"}</span>
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Product Location:{" "}
              <span className="font-semibold">{product.location || "-"}</span>
            </div>

            <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <Link href={`/profile/${product.owner?._id}`}>
                <img
                  src={product.owner?.image || "/default-profile.png"}
                  alt="Seller Image"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-[#325082] w-[60px] h-[60px] transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/default-profile.png";
                  }}
                />
              </Link>
              <div className="flex flex-col">
                <h3 className="font-semibold">
                  {isOwner ? "Seller (Me):" : "Seller:"}
                </h3>
                <p className="font-semibold text-[#222]">
                  {product.owner?.name}
                </p>
                <p className="text-[14px] text-[#222]">
                  <MaskedUserId email={product.owner?.email} reveal={isOwner} />
                </p>
              </div>
            </div>

            <CommentSection
              productId={product._id.toString()}
              initialComments={product.comments || []}
              userEmail={sessionEmail}
              productOwnerEmail={product.owner?.email}
              isAvailable={product.isAvailable}
            />
          </div>
        </div>
      </main>
    </>
  );
}
