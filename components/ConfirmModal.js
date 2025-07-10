"use client";
import { useEffect, useState } from "react";

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) setShow(true);
  }, [isOpen]);

  const handleCancel = () => {
    // trigger fade out
    setShow(false);
    setTimeout(() => onCancel(), 500); // wait for fade-out animation
  };

  const handleConfirm = () => {
    setShow(false);
    setTimeout(() => onConfirm(), 500);
  };

  if (!isOpen && !show) return null;

  return (
    <div
      className={`fixed inset-0 z-[10001] flex items-center justify-center bg-black/30 backdrop-blur-[1px] transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-[#1e1e2f] text-white p-6 rounded-xl shadow-lg transition-all duration-500 transform ${
          show ? "scale-100" : "scale-95"
        } w-[90%] max-w-sm text-center`}
      >
        <p className="mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={handleCancel}
            className="bg-gray-600 w-[80px] py-2 rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="bg-blue-600 w-[80px] py-2 rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
