// components/ProductDeleteButton.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "./ActionButton";
import ConfirmModal from "./ConfirmModal";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function ProductDeleteButton({ productId, type = "sell" }) {
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const redirectTo =
    type === "donation"
      ? "/donation"
      : type === "auction"
        ? "/auction"
        : "/sell";

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setShowModal(false);

      // show global loading overlay immediately
      window.dispatchEvent(new Event("overlay:show"));

      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        window.dispatchEvent(new Event("overlay:hide"));
        setDeleting(false);
        alert("Failed to delete product.");
        return;
      }

      // go directly to target page
      router.replace(redirectTo);
    } catch (err) {
      window.dispatchEvent(new Event("overlay:hide"));
      setDeleting(false);
      alert("Error deleting product.");
    }
  };

  return (
    <>
      <ActionButton
        text={deleting ? "Deleting..." : "Delete"}
        variant="dangerOutlineHover"
        icon={<TrashIcon className="w-5 h-5" />}
        onClick={() => {
          if (!deleting) setShowModal(true);
        }}
        disabled={deleting}
      />

      <ConfirmModal
        isOpen={showModal}
        message="Are you sure you want to delete this product?"
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setShowModal(false);
        }}
        variant="danger"
      />
    </>
  );
}
