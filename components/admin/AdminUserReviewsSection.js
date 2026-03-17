"use client";

import { useState } from "react";
import {
  StarIcon as StarSolid,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  UserIcon,
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

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500 text-center">
      {text}
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="shrink-0">
          <div className="w-[64px] h-[64px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img
              src={image || "/placeholder.png"}
              alt={title || "Review item"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* row 1 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5">
              <h4 className="text-[14px] font-semibold text-slate-800 truncate leading-5">
                {title || "Untitled"}
              </h4>
              <span className="text-[12px] text-slate-300">/</span>
              <p className="text-[11px] text-slate-500 truncate leading-5">
                {category || "-"}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <Stars value={rating} />
              <span className="text-[11px] font-semibold text-slate-700">
                {rating}/5
              </span>
            </div>
          </div>

          {/* row 2 */}
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5 text-[11px]">
              <span className="text-[#325082] font-medium truncate">
                {reviewTypeLabel}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600 truncate">
                {personLabel || "-"}
              </span>
            </div>

            {createdAt && (
              <p className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* row 3 */}
          <div className="mt-1.5 flex items-start gap-1.5">
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-slate-400 mt-[2px] shrink-0" />
            <p className="text-[12px] text-slate-700 leading-[1.4] break-words line-clamp-2">
              {comment || "No written comment."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewColumn({
  title,
  subtitle,
  icon,
  items,
  emptyText,
  visible,
  onLoadMore,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-slate-500">{icon}</div>
          <div>
            <h3 className="text-[17px] font-semibold text-slate-800">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600">
          {items.length} total
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <>
          <div className="space-y-2.5">
            {items.slice(0, visible).map((review, idx) => (
              <ReviewCard
                key={`${review.transactionId}-${review.createdAt || idx}-${title}`}
                {...review}
              />
            ))}
          </div>

          {items.length > visible && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onLoadMore}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminUserReviewsSection({
  receivedReviews = [],
  writtenReviews = [],
}) {
  const [receivedVisible, setReceivedVisible] = useState(INITIAL_VISIBLE);
  const [writtenVisible, setWrittenVisible] = useState(INITIAL_VISIBLE);

  const avgReceived =
    receivedReviews.length > 0
      ? (
          receivedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          receivedReviews.length
        ).toFixed(1)
      : "0.0";

  const avgWritten =
    writtenReviews.length > 0
      ? (
          writtenReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          writtenReviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-[#1f2f4c]">
            Review Background
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            User's review history, including reviews received and reviews
            written to others.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:w-[520px]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Received Reviews</div>
            <div className="text-lg font-semibold text-slate-800">
              {receivedReviews.length}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Avg Received</div>
            <div className="text-lg font-semibold text-slate-800">
              {avgReceived}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Written Reviews</div>
            <div className="text-lg font-semibold text-slate-800">
              {writtenReviews.length}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Avg Written</div>
            <div className="text-lg font-semibold text-slate-800">
              {avgWritten}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ReviewColumn
          title="Reviews About This User"
          subtitle="Feedback received from buyers, sellers, donors, or recipients."
          icon={<UserIcon className="w-5 h-5" />}
          items={receivedReviews}
          visible={receivedVisible}
          onLoadMore={() =>
            setReceivedVisible((prev) => prev + LOAD_MORE_COUNT)
          }
          emptyText="No reviews received yet."
        />

        <ReviewColumn
          title="Reviews Written By This User"
          subtitle="Feedback this user has written for other people."
          icon={<PencilSquareIcon className="w-5 h-5" />}
          items={writtenReviews}
          visible={writtenVisible}
          onLoadMore={() => setWrittenVisible((prev) => prev + LOAD_MORE_COUNT)}
          emptyText="No written reviews yet."
        />
      </div>
    </section>
  );
}
