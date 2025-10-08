"use client";
import React from "react";

export default function FilterDropdown({
  show,
  filters,
  setFilters,
  onApply,
  onClear,
  isDonationPage = false, // ✅ NEW: flag to hide price filters
}) {
  if (!show) return null;

  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 mt-[220px] max-w-[95%] w-[500px] bg-white border border-gray-300 rounded-[6px] p-4 shadow-xl z-50 max-[768px]:w-[50%] max-[768px]:mt-[400px]">
      <div
        className={`grid ${
          isDonationPage
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        } gap-3`}
      >
        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border border-gray-400 p-2 rounded-[4px] text-sm w-full"
        >
          <option value="">All Categories</option>
          <option value="IT/Tech">IT/Tech Devices</option>
          <option value="Home Appliances">Home Appliances</option>
          <option value="Furniture">Furniture</option>
          <option value="Stationeries">Stationeries</option>
          <option value="Clothing">Clothing</option>
          <option value="Others">Others</option>
        </select>

        {/* ✅ Hide Min/Max Price if donation page */}
        {!isDonationPage && (
          <>
            <input
              type="number"
              placeholder="Min Price"
              min="0"
              value={filters.minPrice}
              onChange={(e) =>
                setFilters({ ...filters, minPrice: e.target.value })
              }
              className="border border-gray-400 p-2 rounded-[4px] text-sm w-full"
            />

            <input
              type="number"
              placeholder="Max Price"
              min="0"
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: e.target.value })
              }
              className="border border-gray-400 p-2 rounded-[4px] text-sm w-full"
            />
          </>
        )}

        {/* Condition */}
        <select
          value={filters.condition}
          onChange={(e) =>
            setFilters({ ...filters, condition: e.target.value })
          }
          className="border border-gray-400 p-2 rounded-[4px] text-sm w-full"
        >
          <option value="">Any Condition</option>
          <option value="new">New</option>
          <option value="like new">Like New</option>
          <option value="used">Used</option>
          <option value="poor">Poor</option>
        </select>

        {/* ✅ Donation mode (only on donation page) */}
        {isDonationPage && (
          <select
            value={filters.donationMode || ""} // "" | "instant" | "selective"
            onChange={(e) =>
              setFilters({ ...filters, donationMode: e.target.value })
            }
            className="border border-gray-400 p-2 rounded-[4px] text-sm w-full"
          >
            <option value="">All Donation</option>
            <option value="instant">Instant (first-come)</option>
            <option value="selective">Selective (choose recipient)</option>
          </select>
        )}

        {/* Location */}
        <input
          type="text"
          placeholder="Meetup Location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className={`border border-gray-400 p-2 rounded-[4px] text-sm w-full ${
            isDonationPage
              ? "col-span-1 sm:col-span-2 md:col-span-3"
              : "col-span-1 sm:col-span-2 md:col-span-4"
          }`}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-between max-[376px]:flex-col gap-y-2 mt-3">
        <button
          onClick={onClear}
          className="px-4 py-2 border border-[#325082] text-[#325082] rounded-[4px] hover:bg-[#325082] hover:text-white text-sm"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-[#325082] text-white rounded-[4px] hover:opacity-90 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
