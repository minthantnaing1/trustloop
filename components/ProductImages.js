"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/solid";

export default function ProductImages({ images = [], defaultImage }) {
  // ✅ Ensure defaultImage is shown first
  const orderedImages = useMemo(() => {
    if (!defaultImage || !images.includes(defaultImage)) return images;
    return [defaultImage, ...images.filter((img) => img !== defaultImage)];
  }, [images, defaultImage]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(false);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : orderedImages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % orderedImages.length);
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
            className="flex items-center gap-1 text-sm text-[#325082] bg-white/80 hover:bg-white transition duration-800 px-1 py-1 rounded-md shadow-sm hover:underline"
          >
            {isVertical ? (
              <>
                <ArrowsPointingOutIcon className="h-4 w-4" />
                Switch to Horizontal View
              </>
            ) : (
              <>
                <ArrowsPointingInIcon className="h-4 w-4" />
                Switch to Vertical View
              </>
            )}
          </button>
        </div>

        {/* Carousel */}
        <div
          className="flex transition-transform duration-800 ease-in-out w-full h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
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
        <button
          onClick={handlePrev}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-[#325082] bg-opacity-80 hover:bg-opacity-100 p-1 rounded-full shadow-md z-10"
        >
          <ChevronLeftIcon className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={handleNext}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-[#325082] bg-opacity-80 hover:bg-opacity-100 p-1 rounded-full shadow-md z-10"
        >
          <ChevronRightIcon className="w-6 h-6 text-white" />
        </button>
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
          >
            <img
              src={img}
              alt={`Thumb ${idx}`}
              className="object-cover w-full h-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
