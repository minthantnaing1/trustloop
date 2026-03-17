"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StarIcon as StarSolid,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

const INITIAL_VISIBLE = 4;
const LOAD_MORE_COUNT = 4;

function Stars({ value = 0 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) =>
        i <= value ? (
          <StarSolid key={i} className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarOutline key={i} className="w-4 h-4 text-gray-300" />
        ),
      )}
    </div>
  );
}

function ReviewCard({
  title,
  image,
  category,
  rating,
  comment,
  reviewTypeLabel,
  personLabel,
  createdAt,
}) {
  return (
    <div className="rounded-[10px] border border-[#dbe4f0] bg-white px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="shrink-0">
          <div className="w-[62px] h-[62px] rounded-[8px] overflow-hidden border border-[#d9e3f0] bg-[#f6f9ff]">
            <img
              src={image || "/placeholder.png"}
              alt={title || "Review item"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* 1st row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5">
              <h3 className="text-[14px] font-semibold text-[#1f2f4c] truncate leading-5">
                {title || "Untitled"}
              </h3>
              <span className="text-[12px] text-gray-300">/</span>
              <p className="text-[11px] text-gray-500 truncate leading-5">
                {category || "-"}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <Stars value={rating} />
              <span className="text-[11px] font-semibold text-[#1f2f4c]">
                {rating}/5
              </span>
            </div>
          </div>

          {/* 2nd row */}
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5 text-[11px]">
              <span className="text-[#325082] font-medium truncate">
                {reviewTypeLabel}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-600 truncate">
                {personLabel || "-"}
              </span>
            </div>

            {createdAt && (
              <p className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">
                {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* 3rd row */}
          <div className="mt-1.5 flex items-start gap-1.5">
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-[#7a93ba] mt-[2px] shrink-0" />
            <p className="text-[12px] text-gray-700 leading-[1.4] break-words line-clamp-2">
              {comment || "No written comment."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#d7e3f3] bg-white/80 px-4 py-6 text-sm text-gray-500 text-center">
      {text}
    </div>
  );
}

export default function ProfileReviewsSection({
  boughtReviewTargets = [],
  soldReviewTargets = [],
  publicOnly = false,
  publicReviews = [],
}) {
  const [loading, setLoading] = useState(!publicOnly);
  const [myReviews, setMyReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [myVisible, setMyVisible] = useState(INITIAL_VISIBLE);
  const [receivedVisible, setReceivedVisible] = useState(INITIAL_VISIBLE);

  const allTargets = useMemo(
    () => [...boughtReviewTargets, ...soldReviewTargets],
    [boughtReviewTargets, soldReviewTargets],
  );

  useEffect(() => {
    if (publicOnly) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadReviews() {
      try {
        setLoading(true);

        const ownResults = [];
        const receivedResults = [];

        for (const item of allTargets) {
          const {
            transactionId,
            title,
            image,
            category,
            kind,
            side,
            counterpartyName,
          } = item;

          const isDonation = String(kind || "").toUpperCase() === "DONATION";

          let myReviewUrl = `/api/transactions/${transactionId}/review`;
          if (side === "seller") {
            myReviewUrl = `/api/transactions/${transactionId}/review?role=${
              isDonation ? "donor" : "seller"
            }`;
          }

          const receivedReviewUrl = `/api/transactions/${transactionId}/review?role=${
            side === "buyer"
              ? isDonation
                ? "donor"
                : "seller"
              : isDonation
                ? "recipient"
                : "buyer"
          }`;

          const [myRes, receivedRes] = await Promise.all([
            fetch(myReviewUrl, { cache: "no-store" }),
            fetch(receivedReviewUrl, { cache: "no-store" }),
          ]);

          const myData = myRes.ok ? await myRes.json() : null;
          const receivedData = receivedRes.ok ? await receivedRes.json() : null;

          if (myData?.rating) {
            ownResults.push({
              transactionId,
              title,
              image,
              category,
              rating: myData.rating,
              comment: myData.comment || "",
              createdAt: myData.createdAt || null,
              reviewTypeLabel:
                side === "buyer"
                  ? isDonation
                    ? "You reviewed donor"
                    : "You reviewed seller"
                  : isDonation
                    ? "You reviewed recipient"
                    : "You reviewed buyer",
              personLabel: counterpartyName || "-",
            });
          }

          if (receivedData?.rating) {
            receivedResults.push({
              transactionId,
              title,
              image,
              category,
              rating: receivedData.rating,
              comment: receivedData.comment || "",
              createdAt: receivedData.createdAt || null,
              reviewTypeLabel:
                side === "buyer"
                  ? isDonation
                    ? "Donor reviewed you"
                    : "Seller reviewed you"
                  : isDonation
                    ? "Recipient reviewed you"
                    : "Buyer reviewed you",
              personLabel: counterpartyName || "-",
            });
          }
        }

        ownResults.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        receivedResults.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );

        if (!mounted) return;
        setMyReviews(ownResults);
        setReceivedReviews(receivedResults);
      } catch (err) {
        console.error("Failed to load profile reviews:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReviews();

    return () => {
      mounted = false;
    };
  }, [allTargets, publicOnly]);

  const visibleMyReviews = myReviews.slice(0, myVisible);
  const visibleReceivedReviews = receivedReviews.slice(0, receivedVisible);
  const visiblePublicReviews = publicReviews.slice(0, receivedVisible);

  return (
    <section className="mt-8">
      <div className="rounded-[12px] border border-[#d9e3f0] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fc_100%)] p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#325082]">
            Reviews
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {publicOnly
              ? "Feedback received from other users."
              : "Feedback you gave and feedback received from other users."}
          </p>
        </div>

        {loading ? (
          <div className="rounded-[10px] border border-[#e4ebf5] bg-white px-4 py-4 text-sm text-gray-500">
            Loading reviews...
          </div>
        ) : publicOnly ? (
          <div className="rounded-[12px] border border-[#e1e9f4] bg-white/70 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] font-semibold text-[#1f2f4c]">
                Reviews About This User
              </h3>
              {publicReviews.length > 0 && (
                <span className="text-xs font-medium text-[#6b7f9f] bg-[#eef4ff] px-2 py-1 rounded-full">
                  {publicReviews.length} total
                </span>
              )}
            </div>

            {publicReviews.length === 0 ? (
              <EmptyState text="No reviews yet." />
            ) : (
              <>
                <div className="space-y-2.5">
                  {visiblePublicReviews.map((review) => (
                    <ReviewCard
                      key={`public-${review.transactionId}-${review.createdAt || ""}`}
                      {...review}
                    />
                  ))}
                </div>

                {publicReviews.length > receivedVisible && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setReceivedVisible((prev) => prev + LOAD_MORE_COUNT)
                      }
                      className="inline-flex items-center rounded-[7px] border border-[#cfdcf0] bg-white px-3 py-1.5 text-sm font-medium text-[#325082] hover:bg-[#f7faff]"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* My Reviews */}
            <div className="rounded-[12px] border border-[#e1e9f4] bg-white/70 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[17px] font-semibold text-[#1f2f4c]">
                  My Reviews
                </h3>
                {myReviews.length > 0 && (
                  <span className="text-xs font-medium text-[#6b7f9f] bg-[#eef4ff] px-2 py-1 rounded-full">
                    {myReviews.length} total
                  </span>
                )}
              </div>

              {myReviews.length === 0 ? (
                <EmptyState text="You haven’t written any reviews yet." />
              ) : (
                <>
                  <div className="space-y-2.5">
                    {visibleMyReviews.map((review) => (
                      <ReviewCard
                        key={`my-${review.transactionId}`}
                        {...review}
                      />
                    ))}
                  </div>

                  {myReviews.length > myVisible && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setMyVisible((prev) => prev + LOAD_MORE_COUNT)
                        }
                        className="inline-flex items-center rounded-[7px] border border-[#cfdcf0] bg-white px-3 py-1.5 text-sm font-medium text-[#325082] hover:bg-[#f7faff]"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Reviews About Me */}
            <div className="rounded-[12px] border border-[#e1e9f4] bg-white/70 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[17px] font-semibold text-[#1f2f4c]">
                  Reviews About Me
                </h3>
                {receivedReviews.length > 0 && (
                  <span className="text-xs font-medium text-[#6b7f9f] bg-[#eef4ff] px-2 py-1 rounded-full">
                    {receivedReviews.length} total
                  </span>
                )}
              </div>

              {receivedReviews.length === 0 ? (
                <EmptyState text="No one has reviewed you yet." />
              ) : (
                <>
                  <div className="space-y-2.5">
                    {visibleReceivedReviews.map((review) => (
                      <ReviewCard
                        key={`received-${review.transactionId}`}
                        {...review}
                      />
                    ))}
                  </div>

                  {receivedReviews.length > receivedVisible && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setReceivedVisible((prev) => prev + LOAD_MORE_COUNT)
                        }
                        className="inline-flex items-center rounded-[7px] border border-[#cfdcf0] bg-white px-3 py-1.5 text-sm font-medium text-[#325082] hover:bg-[#f7faff]"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
