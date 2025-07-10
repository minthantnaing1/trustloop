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
    <div className="absolute top-[55px] left-[300px] w-[45%] bg-white border border-[#ccc] rounded-lg p-4 shadow-md z-50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border p-2 rounded-md text-sm"
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
          className="border p-2 rounded-md text-sm"
        />

        <input
          type="number"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
          className="border p-2 rounded-md text-sm"
        />

        <select
          value={filters.condition}
          onChange={(e) =>
            setFilters({ ...filters, condition: e.target.value })
          }
          className="border p-2 rounded-md text-sm"
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
          className="border p-2 rounded-md col-span-2 md:col-span-1 text-sm"
        />
      </div>

      <div className="flex justify-end gap-3 mt-3">
        <button
          onClick={onClear}
          className="px-4 py-2 border border-[#ccc] rounded-md hover:bg-gray-100 text-sm"
        >
          Clear
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-[#325082] text-white rounded-md hover:opacity-90 text-sm"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
