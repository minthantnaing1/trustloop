"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";

const images = ["/AU_ABAC.jpg", "/AU_ABAC2.jpg", "/AU_ABAC3.jpg"];

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-[16/9] mt-[0.2px] overflow-hidden shadow-lg">
      {/* Image Slider */}
      <div
        className="flex w-full h-full transition-transform duration-1500 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Slide ${i}`}
            className="w-full h-full flex-shrink-0 object-cover"
          />
        ))}
      </div>

      {/* Gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none"></div>

      {/* Persistent Overlay Text & Button */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 drop-shadow-lg">
          Welcome to TrustLoop
        </h1>
        <p className="max-w-[800px] text-sm sm:text-lg mb-6 drop-shadow-lg">
          Assumption University&apos;s exclusive marketplace. Buy, sell,
          auction, or donate securely among AU students.
        </p>
        <Link href="/buy">
          <ActionButton text="Start Exploring" variant="glassClick" />
        </Link>
      </div>

      {/* Dots Navigation */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full ${
              i === index ? "bg-white" : "bg-white/50"
            } transition`}
          ></button>
        ))}
      </div>
    </div>
  );
}
