// components/HideToggleButton.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";

export default function HideToggleButton({ productId, initialHidden }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(Boolean(initialHidden));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const wantUnhide = hidden === true;
  const message = hidden
    ? "Are you sure you want to unhide this post?"
    : "Are you sure you want to hide this post?";

  async function onConfirm() {
    try {
      setBusy(true);
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !wantUnhide }), // visible -> hide, hidden -> unhide
      });
      if (!res.ok) throw new Error(await res.text());
      setHidden(!hidden);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(e.message || "Failed to update visibility");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy || isPending}
        className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 cursor-pointer rounded-full transition-transform duration-700 ease-in-out transform group hover:scale-[1.1]
          ${
            !hidden
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        title={!hidden ? "Visible — click to hide" : "Hidden — click to unhide"}
      >
        {!hidden ? (
          <>
            <EyeIcon className="h-4 w-4 transform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
            Unhidden
          </>
        ) : (
          <>
            <EyeSlashIcon className="h-4 w-4 transform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
            Hidden
          </>
        )}
      </button>

      <ConfirmModal
        isOpen={open}
        message={message}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
