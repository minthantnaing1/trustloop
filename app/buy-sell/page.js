"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  AdjustmentsHorizontalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function BuySellPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showDeleteMode, setShowDeleteMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    location: "",
  });

  const fetchProducts = async () => {
    const query = new URLSearchParams({
      search,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      condition: filters.condition,
      location: filters.location,
    });

    const res = await fetch(`/api/products?${query.toString()}`);
    const data = await res.json();
    setProducts(data.products);
    setUserEmail(data.userEmail);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts(products.filter((p) => p._id !== id));
      setConfirmDeleteId(null);
    } else {
      alert("Failed to delete product.");
    }
  };

  const handleApplyFilters = () => {
    fetchProducts();
    setShowFilter(false);
  };

  return (
    <>
      <NavBar />
      <div className={`${confirmDeleteId ? "brightness-50" : ""}`}>
        <div className="flex justify-between items-center mt-[110px] mb-6 max-w-[1200px] mx-auto w-full gap-3 relative">
          <h2 className="text-lg font-semibold text-black">Items</h2>

          {/* Search + Filter */}
          <div className="flex items-center border border-[#ccc] rounded-[8px] w-[60%] px-0.5">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
            </button>

            <input
              className="flex-1 px-2 py-[10px] text-sm outline-none"
              placeholder="Search for anything..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={fetchProducts}
              className="bg-[#325082] text-white px-4 py-[6px] rounded-md hover:opacity-90"
            >
              Search
            </button>
          </div>

          {/* Sell + Delete Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteMode(!showDeleteMode)}
              className={`px-[16px] py-[10px] text-sm rounded-[8px] ${
                showDeleteMode
                  ? "bg-red-600 text-white"
                  : "bg-[#325082] text-white"
              } hover:opacity-90`}
            >
              {showDeleteMode ? "Cancel Delete" : "Delete Post"}
            </button>
            <Link href="/sell">
              <button className="bg-[#325082] text-white px-[16px] py-[10px] text-sm rounded-[8px] hover:opacity-90">
                + Sell Your Items
              </button>
            </Link>
          </div>

          {/* Filter Dropdown */}
          {showFilter && (
            <div className="absolute top-[60px] left-[18%] w-[64%] bg-white border border-[#ccc] rounded-lg p-4 shadow-md z-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                  className="border p-2 rounded-md text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                  className="border p-2 rounded-md col-span-2 md:col-span-1 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => {
                    setFilters({
                      category: "",
                      minPrice: "",
                      maxPrice: "",
                      condition: "",
                      location: "",
                    });
                    fetchProducts();
                    setShowFilter(false);
                  }}
                  className="px-4 py-2 border border-[#ccc] rounded-md hover:bg-gray-100 text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 bg-[#325082] text-white rounded-md hover:opacity-90 text-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <section className="max-w-[1200px] mx-auto mb-5">
          {products.length === 0 ? (
            <p className="text-center text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-[20px]">
              {products.map((product) => {
                const isOwner = product.owner?.email === userEmail;

                return (
                  <div
                    key={product._id}
                    className="relative flex flex-col justify-end h-[300px] bg-[#e2e2e2] rounded-[10px] p-[10px] hover:shadow-md transition"
                  >
                    {showDeleteMode && isOwner && (
                      <button
                        onClick={() => setConfirmDeleteId(product._id)}
                        className="absolute top-2 right-2 bg-white rounded-full border border-gray-300 p-1 hover:bg-red-500 hover:text-white"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      href={`/buy-sell/${product._id}`}
                      className="flex flex-col flex-1"
                    >
                      <div className="h-[90%] bg-[#ccc] rounded-[8px] mb-[10px]" />
                      <div className="px-[6px] py-[4px] text-[14px] text-black">
                        <h4 className="m-0 font-semibold">{product.title}</h4>
                        <p className="m-0 text-[12px] text-[#555]">
                          {product.category}
                        </p>
                      </div>
                    </Link>

                    <button className="w-full bg-[#325082] text-white text-[12px] py-[6px] px-[8px] rounded-[6px] hover:opacity-90">
                      Add To Cart
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-md w-[350px]">
            <h3 className="text-lg font-semibold mb-4">
              Are you sure you want to delete this post?
            </h3>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:opacity-90"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
