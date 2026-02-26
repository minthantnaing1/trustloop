// components/AuctionDetails.js
"use client";

import { useState } from "react";
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
import { fmtBKK } from "@/utils/timeAgo";
import { useRouter } from "next/navigation";

function ceilBaht(n) {
  return Math.ceil(Number(n) || 0);
}

// ✅ Correct rule: increment is ALWAYS 5% of BASE (not last)
function computeMinNextBid(product) {
  const base = Number(product?.startingPrice) || 0;
  const last = Number(product?.currentBid?.amount) || 0;

  const inc = ceilBaht(base * 0.05); // always base increment
  const ref = last > 0 ? last : base;
  return ceilBaht(ref + inc);
}

export default function AuctionDetails({
  product,
  sessionEmail,
  initialIsFav,
  isOwner,
  guard,
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);

  const endsAt = product?.auctionEndsAt
    ? new Date(product.auctionEndsAt)
    : null;
  const ended = endsAt ? endsAt.getTime() <= Date.now() : false;

  const basePrice = Number(product?.startingPrice) || 0;
  const hasBid = Boolean(product?.currentBid?.amount);
  const current = hasBid ? Number(product.currentBid.amount) : basePrice;

  const minNextBid = computeMinNextBid(product);

  // ✅ Fix #3: prevent same bidder from bidding twice in a row
  const lastBidderEmail = product?.currentBid?.bidder?.email || "";
  const viewerIsLastBidder =
    Boolean(sessionEmail) && sessionEmail === lastBidderEmail;

  const canBid =
    !isOwner &&
    product?.isAvailable !== false &&
    !product?.isHidden &&
    !ended &&
    !viewerIsLastBidder;

  const winnerBidderId =
    product?.auctionResolution?.status === "AWAITING_PAYMENT"
      ? String(
          product?.auctionResolution?.queue?.[
            Number(product?.auctionResolution?.currentIndex || 0)
          ]?.bidder || "",
        )
      : "";

  async function acceptHighestBid() {
    if (!hasBid) return;
    if (!confirm("Accept the highest bid and close this auction now?")) return;

    try {
      setAccepting(true);
      const res = await fetch(`/api/auction/${product._id}/accept-highest`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Failed to accept highest bid.");
        return;
      }
      router.refresh();
    } catch {
      alert("Something went wrong.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-2">
          <BackButton />

          {isOwner && product?.isAvailable !== false && (
            <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto self-end sm:self-auto sm:ml-auto justify-end flex-wrap">
              <HideToggleButton
                productId={product._id}
                initialHidden={product.isHidden}
              />

              <Link href={`/auction/${product._id}/edit`}>
                <ActionButton
                  text="Edit"
                  variant="outlineHover"
                  icon={<PencilIcon className="w-4.5 h-4.5" />}
                />
              </Link>

              <ProductDeleteButton productId={product._id} type="auction" />
            </div>
          )}
        </div>

        <div className="flex gap-[30px] flex-col sm:flex-row">
          {/* LEFT */}
          <div className="flex flex-col gap-2 w-full sm:w-[520px] lg:w-[560px] flex-none">
            <div className="mb-1">
              <ProductImages
                images={product.images}
                defaultImage={product.defaultImage}
              />
            </div>

            {/* ✅ Fix #1: Bid history with image + name */}
            <div className="bg-[#fafafa] border border-gray-300 rounded-md">
              <div className="px-3 pt-3">
                <h3 className="font-semibold text-[#325082]">Bid History</h3>
              </div>

              <div className="mt-2 px-3 pb-3 sm:max-h-[220px] overflow-y-auto">
                {product?.bidHistory?.length ? (
                  <ul className="space-y-2">
                    {[...product.bidHistory]
                      .sort((a, b) => new Date(b.time) - new Date(a.time))
                      .map((b, idx) => {
                        const rowBidderId = String(
                          b?.bidder?._id || b?.bidder || "",
                        );
                        const isWinner =
                          winnerBidderId && rowBidderId === winnerBidderId;
                        return (
                          <li
                            key={`${b.time}-${idx}`}
                            className={`flex items-center justify-between gap-3 p-2 rounded border bg-white ${isWinner ? "border-emerald-300 bg-emerald-50" : "border-gray-200"}`}
                          >
                            {/* bidder */}
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={b?.bidder?.image || "/default-profile.png"}
                                alt="Bidder"
                                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.src = "/default-profile.png";
                                }}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[#1f2f4c] truncate flex items-center gap-2">
                                  <span className="truncate">
                                    {b?.bidder?.name ||
                                      b?.bidder?.email ||
                                      "Unknown Bidder"}
                                  </span>

                                  {isWinner && (
                                    <span className="shrink-0 text-[10px] px-2 py-[2px] rounded-full border border-emerald-300 bg-white text-emerald-700 font-semibold">
                                      SELECTED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  <MaskedUserId
                                    email={b?.bidder?.email}
                                    reveal={false}
                                  />
                                  {b?.time ? ` • ${fmtBKK(b.time)}` : ""}
                                </div>
                              </div>
                            </div>

                            {/* amount */}
                            <div className="shrink-0 text-sm font-semibold text-[#1f2f4c]">
                              ฿{Number(b.amount || 0).toLocaleString()}
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No bids yet. First valid bid must be at least{" "}
                    <span className="font-semibold">
                      ฿{minNextBid.toLocaleString()}
                    </span>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="min-w-0 flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>

            <div className="text-gray-700">
              Category:{" "}
              <span className="font-semibold">{product.category || "-"}</span>
            </div>

            {/* Auction summary */}
            <div className="bg-[#f0f7ff] border border-[#cfe3ff] p-3 rounded-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#325082] text-white text-[12px] font-medium px-2 py-1 rounded border border-[#325082]">
                  Auction
                </span>

                {endsAt && (
                  <span
                    className={`text-[12px] font-medium px-2 py-1 rounded border ${
                      ended
                        ? "text-red-700 border-red-200 bg-red-50"
                        : "text-[#325082] border-[#cfe3ff] bg-white"
                    }`}
                  >
                    {ended ? "Ended" : "Ends"}: {fmtBKK(endsAt)}
                  </span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="bg-white border border-[#e6efff] rounded p-2">
                  <div className="text-xs text-gray-600">Base price</div>
                  <div className="font-semibold text-[#1f2f4c]">
                    ฿{basePrice.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Minimum base is ฿1,000
                  </div>
                </div>

                <div className="bg-white border border-[#e6efff] rounded p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-gray-600">
                        Current highest bid
                      </div>
                      <div className="font-semibold text-[#1f2f4c]">
                        ฿{current.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Next bid must be ≥{" "}
                        <span className="font-semibold">
                          ฿{minNextBid.toLocaleString()}
                        </span>{" "}
                        (increment = 5% of base)
                      </div>
                    </div>

                    {/* ✅ Seller accept button (inside the card) */}
                    {isOwner &&
                      hasBid &&
                      !ended &&
                      product?.isAvailable !== false && (
                        <div className="shrink-0">
                          <ActionButton
                            text={accepting ? "Accepting..." : "Accept Highest"}
                            variant="primaryClick"
                            onClick={acceptHighestBid}
                            disabled={accepting}
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* ✅ Fix #3 UI message */}
              {!isOwner && viewerIsLastBidder && !ended && (
                <div className="mt-2 text-xs sm:text-sm px-3 py-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                  You are currently the highest bidder. You can bid again only
                  after another user places a bid.
                </div>
              )}
            </div>

            {/* Bid button row */}
            {!isOwner && (
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {!canBid && !viewerIsLastBidder && (
                  <div className="w-full text-center text-xs sm:text-sm px-3 py-2 rounded bg-gray-50 border border-gray-200 text-gray-700">
                    {ended
                      ? "⏰ This auction has ended."
                      : product?.isAvailable === false
                        ? "This auction is no longer available."
                        : product?.isHidden
                          ? "This auction is hidden."
                          : "You can’t bid on this item right now."}
                  </div>
                )}

                {canBid && (
                  <>
                    <div className="flex-5 sm:flex-9">
                      <BuyRequestGuard
                        href={`/auction/${product._id}/bid`}
                        guard={guard}
                        text="🔨 Place a Bid"
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
            )}

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
              Meetup Location:{" "}
              <span className="font-semibold">{product.location || "-"}</span>
            </div>

            {/* Seller */}
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
