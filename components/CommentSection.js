"use client";

import { useState } from "react";

export default function CommentSection({
  productId,
  initialComments,
  userEmail,
  productOwnerEmail,
  isAvailable, // ✅ NEW
}) {
  const [comments, setComments] = useState(() =>
    [...initialComments].reverse(),
  );
  const [commentInput, setCommentInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !isAvailable) return; // ✅ guard

    setSubmitting(true);

    const res = await fetch(`/api/products/${productId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commentInput }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setCommentInput("");
    } else {
      alert("Failed to post comment.");
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    const res = await fetch(`/api/products/${productId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });

    if (res.ok) {
      setComments(comments.filter((c) => c._id !== commentId));
    } else {
      alert("Failed to delete comment.");
    }
  };

  return (
    <div className="mt-6">
      <p className="font-semibold mb-2">Public Chat</p>

      <div className="space-y-3 max-h-[250px] overflow-y-auto mb-3 border border-gray-300 rounded-md p-2">
        {comments.map((c, index) => {
          const isCommentOwner = userEmail === c.userEmail;
          const isProductOwner = userEmail === productOwnerEmail;
          const canDelete = isCommentOwner || isProductOwner;

          return (
            <div
              key={(c._id || c.createdAt) + "-" + index}
              className="p-2 bg-gray-100 rounded-md relative"
            >
              <p className="font-semibold">{c.username}</p>
              <p className="text-sm">{c.message}</p>
              <p className="text-[12px] text-gray-500">
                {new Date(c.createdAt).toLocaleString()}
              </p>

              {canDelete && (
                <button
                  onClick={() => handleDeleteComment(c._id)}
                  className="text-red-500 text-sm hover:underline absolute top-2 right-2"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-sm text-gray-400">No comments yet.</p>
        )}
      </div>

      {/* ✅ Closed message */}
      {!isAvailable && (
        <p className="text-sm text-gray-500 mb-2">
          Comments are closed because this item is currently in an active
          transaction.
        </p>
      )}

      {/* ✅ Input disabled when unavailable */}
      <input
        type="text"
        value={commentInput}
        onChange={(e) => setCommentInput(e.target.value)}
        placeholder={
          isAvailable
            ? "Ask questions about this product..."
            : "Comments are closed"
        }
        disabled={!isAvailable}
        className="w-full p-3 border border-gray-300 rounded-md outline-none mb-2 disabled:bg-gray-100"
      />

      <button
        onClick={handleSubmitComment}
        disabled={submitting || !isAvailable}
        className="bg-[#325082] text-white px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 w-full"
      >
        {submitting ? "Posting..." : "Post Comment"}
      </button>
    </div>
  );
}
