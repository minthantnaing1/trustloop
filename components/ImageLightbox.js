"use client";

import { useEffect, useRef } from "react";

export default function ImageLightbox({
  images = [],
  index = 0,
  open = false,
  onClose,
  onChange,
}) {
  const backdropRef = useRef(null);
  const startX = useRef(null);

  const clampIndex = (i) => (i + images.length) % images.length;
  const goNext = () => onChange && onChange(clampIndex(index + 1));
  const goPrev = () => onChange && onChange(clampIndex(index - 1));

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, index]);

  if (!open || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose?.();
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX.current;
        startX.current = null;
        if (diff > 50) goPrev();
        if (diff < -50) goNext();
      }}
    >
      <div className="relative max-w-[95vw] max-h-[90vh]">
        {/* Fullscreen image */}
        <img
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="max-w-[95vw] max-h-[90vh] object-contain"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 px-3 py-1 rounded bg-white text-black text-sm hover:bg-gray-200"
        >
          ✕ Close
        </button>

        {/* Prev button */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black hover:bg-white"
            >
              ‹
            </button>

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-black hover:bg-white"
            >
              ›
            </button>

            {/* Counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-white/80">
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
