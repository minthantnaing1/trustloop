"use client";

import { useState } from "react";
import ActionButton from "@/components/ActionButton";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";

function Stars({ value = 0, size = 8 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) =>
        i <= value ? (
          <StarSolid
            key={i}
            className={`w-${size} h-${size} text-yellow-400`}
          />
        ) : (
          <StarOutline
            key={i}
            className={`w-${size} h-${size} text-gray-300`}
          />
        )
      )}
    </div>
  );
}

export default function ReviewForm({ transactionId, initialReview = null }) {
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialReview?.comment || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [existing, setExisting] = useState(initialReview); // if present, render read-only

  async function handleSubmit() {
    if (busy) return;
    if (rating < 1) {
      setErr("Please select at least 1 star.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json().catch(() => ({}));
      setExisting({ rating, comment, ...(saved || {}) });
    } catch (e) {
      setErr(e.message || "Failed to submit review");
    } finally {
      setBusy(false);
    }
  }

  if (existing) {
    return (
      <div className="bg-white border border-gray-200 shadow-md rounded-[5px] p-6">
        <h2 className="text-lg font-semibold text-[#325082] mb-3">My Review</h2>
        <div className="flex items-center gap-2 mb-2">
          <Stars value={existing.rating} size={6} />
          <span className="text-sm text-gray-600">{existing.rating}/5</span>
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {existing.comment || "—"}
        </div>
        <div className="bg-green-50 border border-green-300 rounded-[5px] mt-3 p-6 text-center">
          <p className="text-lg font-semibold text-green-700">
            {" "}
            Thanks for your review!{" "}
          </p>
          <p className="text-sm text-green-600 mt-2">
            {" "}
            Your feedback helps build trust in the community.{" "}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-md rounded-[5px] p-6">
      <h2 className="text-lg font-semibold text-[#325082] mb-3">
        Leave a Review
      </h2>

      <div className="flex gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((i) => {
          const active = i <= (hover || rating);
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating((prev) => (prev === i ? 0 : i))}
              aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
              className="focus:outline-none"
            >
              {active ? (
                <StarSolid className="w-8 h-8 text-yellow-400" />
              ) : (
                <StarOutline className="w-8 h-8 text-gray-400 hover:text-yellow-400" />
              )}
            </button>
          );
        })}
      </div>

      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm mb-3"
        rows={3}
        placeholder="Write your review (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}

      <ActionButton
        text={busy ? "Submitting..." : "Submit Review"}
        variant="submitPrimaryClick"
        onClick={handleSubmit}
        disabled={busy}
      />
    </div>
  );
}
