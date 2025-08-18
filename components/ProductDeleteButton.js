"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "./ActionButton";
import ConfirmModal from "./ConfirmModal";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function ProductDeleteButton({ productId }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/buy-sell");
      } else {
        alert("Failed to delete product.");
      }
    } catch (err) {
      alert("Error deleting product.");
    }
  };

  return (
    <>
      <ActionButton
        text="Delete"
        variant="dangerOutlineHover"
        icon={<TrashIcon className="w-5 h-5" />}
        onClick={() => setShowModal(true)}
      />

      <ConfirmModal
        isOpen={showModal}
        message="Are you sure you want to delete this product?"
        onConfirm={handleDelete}
        onCancel={() => setShowModal(false)}
        variant="danger"
      />
    </>
  );
}
