"use client";
import React from "react";

export default function FilterDropdown({
  show,
  filters,
  setFilters,
  onApply,
  onClear,
}) {
  if (!show) return null;

  return (
    <div className="absolute left-1/2 transform -translate-x-1/2 mt-[220px] max-w-[95%] w-[500px] bg-white border border-[#ccc] rounded-lg p-4 shadow-md z-50 max-[768px]:w-[50%] max-[768px]:mt-[110px]">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border p-2 rounded-md text-sm w-full"
        >
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="books">Books</option>
          <option value="furniture">Furniture</option>
          <option value="clothing">Clothing</option>
          <option value="others">Others</option>
        </select>

        <input
          type="number"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
          className="border p-2 rounded-md text-sm w-full"
        />

        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          className="border p-2 rounded-md text-sm w-full"
        />

        <select
          value={filters.condition}
          onChange={(e) =>
            setFilters({ ...filters, condition: e.target.value })
          }
          className="border p-2 rounded-md text-sm w-full"
        >
          <option value="">Any Condition</option>
          <option value="new">New</option>
          <option value="like new">Like New</option>
          <option value="used">Used</option>
          <option value="poor">Poor</option>
        </select>

        <input
          type="text"
          placeholder="Meetup Location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="border p-2 rounded-md text-sm w-full col-span-1 sm:col-span-2 md:col-span-4"
        />
      </div>

      <div className="flex justify-between max-[376px]:flex-col gap-y-2 mt-3">
        <button
          onClick={onClear}
          className="px-4 py-2 border border-[#ccc] rounded-md hover:bg-gray-100 text-sm"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-[#325082] text-white rounded-md hover:opacity-90 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
