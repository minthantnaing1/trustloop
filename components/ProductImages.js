"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

export default function ProductImages({ images = [], defaultImage }) {
  // ✅ Ensure defaultImage is shown first
  const orderedImages = useMemo(() => {
    if (!defaultImage || !images.includes(defaultImage)) return images;
    return [defaultImage, ...images.filter((img) => img !== defaultImage)];
  }, [images, defaultImage]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(false);

  // Lightbox state
  const [open, setOpen] = useState(false);

  // 🚫 Prevent background scrolling when lightbox is open
  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [open]);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    ox: 0,
    oy: 0,
  });

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const zoomIn = () => setZoom((z) => clamp(z + 0.25, 1, 5));
  const zoomOut = () => setZoom((z) => clamp(z - 0.25, 1, 5));
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const openLightbox = (idx) => {
    setCurrentIndex(idx);
    setOpen(true);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const closeLightbox = () => {
    setOpen(false);
    resetZoom();
  };

  const handlePrev = () => {
    const next = currentIndex > 0 ? currentIndex - 1 : orderedImages.length - 1;
    setCurrentIndex(next);
    resetZoom();
  };
  const handleNext = () => {
    const next = (currentIndex + 1) % orderedImages.length;
    setCurrentIndex(next);
    resetZoom();
  };

  // Drag to pan when zoomed
  const onMouseDown = (e) => {
    if (zoom === 1) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };
  const onMouseUp = () => {
    dragRef.current.dragging = false;
  };

  // Touch support
  const onTouchStart = (e) => {
    if (zoom === 1) return;
    const t = e.touches[0];
    dragRef.current = {
      dragging: true,
      startX: t.clientX,
      startY: t.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };
  const onTouchMove = (e) => {
    if (!dragRef.current.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };
  const onTouchEnd = () => {
    dragRef.current.dragging = false;
  };

  // Wheel to zoom
  const onWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoom((z) => clamp(z + 0.15, 1, 5));
    else setZoom((z) => clamp(z - 0.15, 1, 5));
  };

  return (
    <div className="flex-1 w-full">
      {/* Image Container */}
      <div
        className={`relative mx-auto overflow-hidden rounded-[10px] border border-gray-300 bg-[#f1f1f1]
        transition-all duration-800 ease-in-out ${
          isVertical
            ? "aspect-[3/4] max-h-[500px] max-w-[500px]"
            : "aspect-video max-w-[600px] max-h-[500px]"
        }`}
      >
        {/* Switch Orientation Button */}
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsVertical(!isVertical);
            }}
            className="flex items-center gap-1 text-sm text-[#325082] bg-white/80 hover:bg-white transition duration-200 px-2 py-1 rounded-md shadow-sm hover:underline"
            title={
              isVertical
                ? "Switch to Horizontal View"
                : "Switch to Vertical View"
            }
          >
            {isVertical ? (
              <>
                <ArrowsPointingOutIcon className="h-4 w-4" />
                Horizontal
              </>
            ) : (
              <>
                <ArrowsPointingInIcon className="h-4 w-4" />
                Vertical
              </>
            )}
          </button>
        </div>

        {/* Carousel */}
        <div
          className="flex transition-transform duration-800 ease-in-out w-full h-full cursor-pointer"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onClick={() => openLightbox(currentIndex)}
        >
          {orderedImages.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Product ${idx}`}
              className="object-contain w-full h-full flex-shrink-0"
            />
          ))}
        </div>

        {/* Arrows */}
        {orderedImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute top-1/2 left-2 -translate-y-1/2 p-1 bg-[#325082] text-white rounded-full z-10 transition-all duration-500 hover:scale-[1.1] shadow-md"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 p-1 bg-[#325082] text-white rounded-full z-10 transition-all duration-500 hover:scale-[1.1] shadow-md"
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 mt-4 overflow-x-auto">
        {orderedImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-[70px] h-[70px] rounded-[6px] overflow-hidden border-2 ${
              currentIndex === idx
                ? "border-[#325082]"
                : "border-transparent hover:border-gray-300"
            }`}
            title={`Image ${idx + 1}`}
          >
            <img
              src={img}
              alt={`Thumb ${idx}`}
              className="object-cover w-full h-full"
            />
          </button>
        ))}
      </div>

      {/* LIGHTBOX */}
      {open && (
        <div
          className="fixed inset-0 z-[30000] bg-black/70 backdrop-blur-sm flex items-center justify-center select-none overscroll-contain"
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onTouchEnd={onTouchEnd}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={onWheel}
        >
          {/* Close */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-[30020] flex items-center justify-center
                 w-12 h-12 md:w-11 md:h-11 rounded-full
                 bg-black/45 hover:bg-black/65 active:bg-black/75
                 text-white shadow-lg transition"
            aria-label="Close"
            title="Close"
          >
            <XMarkIcon className="w-7 h-7 md:w-6 md:h-6 pointer-events-none" />
          </button>

          {/* Prev/Next */}
          {orderedImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[30010]
                     flex items-center justify-center w-11 h-11 rounded-full
                     bg-black/35 hover:bg-black/55 active:bg-black/70
                     text-white shadow-md transition"
                aria-label="Previous"
                title="Previous"
              >
                <ChevronLeftIcon className="w-6 h-6 pointer-events-none" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[30010]
                     flex items-center justify-center w-11 h-11 rounded-full
                     bg-black/35 hover:bg-black/55 active:bg-black/70
                     text-white shadow-md transition"
                aria-label="Next"
                title="Next"
              >
                <ChevronRightIcon className="w-6 h-6 pointer-events-none" />
              </button>
            </>
          )}

          {/* Image canvas */}
          <div
            className="relative z-[30000] max-w-[92vw] max-h-[86vh] w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => {
              e.preventDefault();
              onMouseDown(e);
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              onTouchStart(e);
            }}
          >
            <img
              src={orderedImages[currentIndex]}
              alt="Full view"
              className="select-none pointer-events-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: dragRef.current.dragging
                  ? "none"
                  : "transform 120ms ease-out",
                maxWidth: "90vw",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[30010] flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                zoomOut();
              }}
              className="px-3 py-2 rounded-md bg-black/40 hover:bg-black/60 text-white"
              title="Zoom out"
            >
              <MinusIcon className="w-5 h-5 pointer-events-none" />
            </button>

            <span className="px-3 py-2 rounded-md bg-black/40 text-white text-sm">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                zoomIn();
              }}
              className="px-3 py-2 rounded-md bg-black/40 hover:bg-black/60 text-white"
              title="Zoom in"
            >
              <PlusIcon className="w-5 h-5 pointer-events-none" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
              }}
              className="ml-2 px-3 py-2 rounded-md bg-black/40 hover:bg-black/60 text-white"
              title="Reset"
            >
              <ArrowPathIcon className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
