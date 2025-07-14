"use client";
import { useEffect, useState } from "react";

export default function ConfirmModal({
  isOpen,
  message,
  onConfirm,
  onCancel,
  variant = "default", // "default" | "danger"
}) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      if (variant === "danger") {
        setCountdown(3); // 5-second delay for delete
      }
    }
  }, [isOpen, variant]);

  // Countdown effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCancel = () => {
    setShow(false);
    setTimeout(() => onCancel(), 500);
  };

  const handleConfirm = () => {
    setShow(false);
    setTimeout(() => onConfirm(), 500);
  };

  if (!isOpen && !show) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  const confirmDisabled = variant === "danger" && countdown > 0;

  return (
    <div
      className={`fixed inset-0 z-[30000] flex items-center justify-center bg-black/30 backdrop-blur-[1px] transition-opacity duration-500 ${
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
            disabled={confirmDisabled}
            className={`${confirmBtnClass} w-[80px] py-2 rounded-md ${
              confirmDisabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {confirmDisabled ? `Wait (${countdown})` : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
