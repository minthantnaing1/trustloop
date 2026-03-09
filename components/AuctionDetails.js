// components/AuctionDetails.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function ceilBaht(n) {
  return Math.ceil(Number(n) || 0);
}

// increment ALWAYS 5% of base
function computeMinNextBid({ product, auction }) {
  const base = Number(product?.startingPrice) || 0;
  const last = Number(auction?.currentBid?.amount) || 0;
  const inc = ceilBaht(base * 0.05);
  const ref = last > 0 ? last : base;
  return ceilBaht(ref + inc);
}

function formatCountdown(target, nowTs) {
  if (!target) return "";
  const diff = new Date(target).getTime() - nowTs;
  if (diff <= 0) return "0d 0h 0m 0s";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function AuctionDetails({
  product,
  auction,
  sessionEmail,
  initialIsFav,
  isOwner,
  guard,
}) {
  const [accepting, setAccepting] = useState(false);
  const [acceptErr, setAcceptErr] = useState("");

  // ✅ local state so UI can update without reload
  const [auctionLive, setAuctionLive] = useState(auction);
  const [nowTs, setNowTs] = useState(Date.now());

  // keep local state synced if server re-renders for any reason
  useEffect(() => {
    setAuctionLive(auction);
  }, [auction?._id]); // only when changing auction doc (safe)

  // ✅ live clock so deadline UI updates automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const endsAt = useMemo(() => {
    return product?.auctionEndsAt
      ? new Date(product.auctionEndsAt)
      : auctionLive?.endsAt
        ? new Date(auctionLive.endsAt)
        : null;
  }, [product?.auctionEndsAt, auctionLive?.endsAt]);

  const timeEnded = endsAt ? endsAt.getTime() <= nowTs : false;

  // stop countdown once winner is selected / auction no longer OPEN
  const biddingClosed = auctionLive?.status && auctionLive.status !== "OPEN";

  const ended = biddingClosed || timeEnded;
  const countdownText =
    endsAt && !biddingClosed && !timeEnded
      ? formatCountdown(endsAt, nowTs)
      : "";

  const basePrice = Number(product?.startingPrice) || 0;
  const hasBid = Boolean(auctionLive?.currentBid?.amount);
  const current = hasBid ? Number(auctionLive.currentBid.amount) : basePrice;
  const minNextBid = computeMinNextBid({ product, auction: auctionLive });

  // prevent same bidder from bidding twice in a row
  const lastBidderEmail = auctionLive?.currentBid?.bidder?.email || "";
  const viewerIsLastBidder =
    Boolean(sessionEmail) && sessionEmail === lastBidderEmail;

  const canBid =
    !isOwner &&
    product?.isAvailable !== false &&
    !product?.isHidden &&
    !ended &&
    auctionLive?.status === "OPEN" &&
    !viewerIsLastBidder;

  // ✅ Winner indicator
  const winner = auctionLive?.winner || null;
  const winnerName = winner?.name || winner?.email || "";
  const payDueAt = auctionLive?.paymentExpiresAt
    ? new Date(auctionLive.paymentExpiresAt)
    : null;
  const showWinnerBox =
    auctionLive?.status === "AWAITING_PAYMENT" ||
    auctionLive?.status === "SOLD";

  // ✅ Seller accept button visibility
  const canSellerAccept =
    isOwner &&
    auctionLive?.status === "OPEN" &&
    !ended &&
    Boolean(auctionLive?.currentBid?.amount) &&
    product?.isAvailable !== false &&
    !product?.isHidden;

  // ✅ owner manage buttons visibility
  const canOwnerManage = isOwner && product?.isAvailable !== false && !ended;

  // ✅ refresh helper (calls server endpoint which also auto-finalizes after deadline)
  const refreshingRef = useRef(false);

  async function refreshAuction() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      // ✅ First: sync SOLD if payment succeeded
      await fetch(`/api/auction/${product._id}/sync-paid`, {
        method: "POST",
      }).catch(() => {});

      // ✅ Then: fetch the updated auction once
      const res = await fetch(`/api/auction/${product._id}/refresh`, {
        method: "POST",
      });
      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));
      if (data?.auction?._id) setAuctionLive(data.auction);
    } finally {
      refreshingRef.current = false;
    }
  }

  // ✅ Auto update when deadline hits + light polling while OPEN
  useEffect(() => {
    // if already ended, immediately refresh once (in case server just auto-assigned)
    if (endsAt && endsAt.getTime() <= Date.now()) {
      refreshAuction();
    }

    // schedule exact refresh at deadline
    let t = null;
    if (endsAt && endsAt.getTime() > Date.now()) {
      const ms = endsAt.getTime() - Date.now() + 600; // small buffer
      t = setTimeout(() => refreshAuction(), ms);
    }

    // light polling only while still OPEN (keeps UI in sync without reload)
    // ✅ Poll fast while waiting for payment, slower while OPEN
    let interval = null;
    if (auctionLive?.status === "AWAITING_PAYMENT") {
      interval = setInterval(() => refreshAuction(), 2000); // 2s
    } else if (auctionLive?.status === "OPEN") {
      interval = setInterval(() => refreshAuction(), 15000); // 15s
    }

    return () => {
      if (t) clearTimeout(t);
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id, auctionLive?.status, endsAt?.getTime?.()]);

  async function onAcceptHighest() {
    if (accepting) return;
    setAcceptErr("");

    const ok = window.confirm(
      "Accept the current highest bidder and close bidding?",
    );
    if (!ok) return;

    try {
      setAccepting(true);

      const res = await fetch(`/api/auction/${product._id}/accept-highest`, {
        method: "POST",
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failed to accept highest bidder");

      let data = {};
      try {
        data = JSON.parse(text);
      } catch {}

      // ✅ no reload: just refresh auction state
      await refreshAuction();
    } catch (e) {
      setAcceptErr(e?.message || "Failed to accept highest bidder");
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

          {canOwnerManage && (
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

            {/* Bid history */}
            <div className="bg-[#fafafa] border border-gray-300 rounded-md">
              <div className="px-3 pt-3">
                <h3 className="font-semibold text-[#325082]">Bid History</h3>
              </div>

              <div className="mt-2 px-3 pb-3 sm:max-h-[220px] overflow-y-auto">
                {auctionLive?.bidHistory?.length ? (
                  <ul className="space-y-2">
                    {[...auctionLive.bidHistory]
                      .sort((a, b) => new Date(b.time) - new Date(a.time))
                      .map((b, idx) => (
                        <li
                          key={`${b.time}-${idx}`}
                          className="flex items-center justify-between gap-3 p-2 rounded border bg-white border-gray-200"
                        >
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
                              <div className="text-sm font-semibold text-[#1f2f4c] truncate">
                                {b?.bidder?.name ||
                                  b?.bidder?.email ||
                                  "Unknown Bidder"}
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

                          <div className="shrink-0 text-sm font-semibold text-[#1f2f4c]">
                            ฿{Number(b.amount || 0).toLocaleString()}
                          </div>
                        </li>
                      ))}
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
                    {auctionLive?.status === "OPEN" && !timeEnded
                      ? "Ends"
                      : "Ended"}
                    : {fmtBKK(endsAt)}
                    {auctionLive?.status === "OPEN" && countdownText
                      ? ` • ${countdownText}`
                      : ""}
                  </span>
                )}

                {auctionLive?.status && (
                  <span className="text-[12px] font-medium px-2 py-1 rounded border text-slate-700 border-slate-200 bg-white">
                    Status: {auctionLive.status}
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
                    Minimum base is ฿10
                  </div>
                </div>

                <div className="bg-white border border-[#e6efff] rounded p-2">
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
              </div>

              {/* ✅ Winner box moved UNDER summary (inside same card) */}
              {showWinnerBox && (
                <div className="mt-3 bg-white border border-emerald-200 rounded p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-emerald-900">
                      Winner selected
                    </div>
                    {auctionLive?.finalPrice ? (
                      <div className="text-sm font-semibold text-[#1f2f4c]">
                        ฿{Number(auctionLive.finalPrice || 0).toLocaleString()}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-1 text-sm text-[#1f2f4c]">
                    <span className="font-semibold">
                      {winnerName || "Unknown"}
                    </span>
                  </div>

                  {auctionLive?.status === "AWAITING_PAYMENT" && payDueAt && (
                    <div className="mt-1 text-[11px] text-emerald-800">
                      Payment due by:{" "}
                      <span className="font-semibold">{fmtBKK(payDueAt)}</span>
                    </div>
                  )}

                  {auctionLive?.status === "SOLD" && (
                    <div className="mt-1 text-[11px] text-emerald-800">
                      Payment completed.
                    </div>
                  )}
                </div>
              )}

              {!isOwner &&
                auctionLive?.status === "OPEN" &&
                viewerIsLastBidder &&
                !timeEnded && (
                  <div className="mt-2 text-xs sm:text-sm px-3 py-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                    You are currently the highest bidder. You can bid again only
                    after another user places a bid.
                  </div>
                )}

              {/* ✅ Seller accept highest bidder (right aligned + ActionButton) */}
              {canSellerAccept && (
                <div className="mt-3">
                  {acceptErr ? (
                    <div className="mb-2 text-xs sm:text-sm px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700">
                      {acceptErr}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <ActionButton
                      text={
                        accepting ? "Accepting..." : "Accept Highest Bidder"
                      }
                      variant="primaryClick"
                      onClick={onAcceptHighest}
                      disabled={accepting}
                    />
                  </div>

                  <div className="mt-1 text-[11px] text-gray-600 text-right">
                    This will select the current highest bidder and create a
                    payment order.
                  </div>
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
                          : auctionLive?.status !== "OPEN"
                            ? "This auction is not accepting bids right now."
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
            <div className="flex items-center justify-between gap-3 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <div className="flex items-center gap-3 min-w-0">
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

                <div className="flex flex-col leading-tight">
                  <h3 className="font-semibold text-[14px]">
                    {isOwner ? "Seller (Me):" : "Seller:"}
                  </h3>
                  <p className="font-semibold text-[#222] text-[14px] leading-tight">
                    {product.owner?.name}
                  </p>
                  <p className="text-[12px] text-[#222]">
                    <MaskedUserId
                      email={product.owner?.email}
                      reveal={isOwner}
                    />
                  </p>
                </div>
              </div>

              {!isOwner && (
                <div className="flex flex-col items-end text-right leading-tight">
                  {/* rating */}
                  <div className="text-[#ffcc00] text-[20px]">
                    {"★".repeat(Math.round(product.owner?.rating || 0)) +
                      "☆".repeat(5 - Math.round(product.owner?.rating || 0))}
                  </div>

                  <div className="text-[13px] text-gray-600">
                    {Number(product.owner?.rating || 0).toFixed(1)}/5 rating
                  </div>

                  {/* sold count */}
                  <div className="text-[13px] text-[#325082] font-semibold mt-[2px]">
                    {product.owner?.soldCount || 0} sold
                  </div>
                </div>
              )}
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
