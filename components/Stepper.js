// components/Stepper.js
"use client";
import React from "react";

/** Built-in presets so you don't need a utils file */
const PRESETS = {
  buyer: ["Checkout", "Pay & Upload", "Deliver", "Review"],
  seller: ["Sell", "Accept / Review", "Deliver", "Payout"],
};

/**
 * Stepper (UI-only)
 * Props:
 * - current: number (1-based) -> which step is active
 * - variant?: 'buyer' | 'seller'  (used only if steps not provided)
 * - steps?: string[]  (override labels; if provided, variant is ignored)
 * - className?: string
 */
export default function Stepper({
  current = 1,
  variant = "buyer",
  steps,
  className = "",
}) {
  const labels =
    Array.isArray(steps) && steps.length > 0
      ? steps
      : PRESETS[variant] || PRESETS.buyer;
  const total = labels.length || 1;
  const cur = Math.min(Math.max(current, 1), total); // clamp 1..total

  return (
    <div className={`mb-5 w-full ${className}`}>
      <ol className="flex items-center w-full text-[11px] sm:text-sm">
        {labels.map((label, i) => {
          const n = i + 1;
          const isDone = n < cur;
          const isActive = n === cur;
          const circleActive = isDone || isActive;

          return (
            <React.Fragment key={`${i}-${label}`}>
              {/* Step */}
              <li
                className={`flex items-center shrink-0 ${
                  circleActive ? "text-[#325082]" : "text-gray-500"
                }`}
              >
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs mr-1 sm:mr-2 ${
                    circleActive
                      ? "bg-[#325082] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {n}
                </span>
                <span className="truncate max-w-[20vw] sm:max-w-none">
                  {label}
                </span>
              </li>

              {/* Connector */}
              {i < labels.length - 1 && (
                <span
                  className={`h-[2px] flex-1 mx-1 sm:mx-3 ${
                    n < cur ? "bg-[#325082]/60" : "bg-[#cfd8e3]"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}

// Optional: named export if you still want to import presets elsewhere
export const STEPPER_PRESETS = PRESETS;
