"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ProductCard from "@/components/ProductCard";
import ConfirmModal from "@/components/ConfirmModal";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

export default function BuySellPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [hideMode, setHideMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    productId: null,
    newStatus: null,
  });

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

  const handleConfirmToggle = async () => {
    const { productId, newStatus } = confirmModal;

    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: newStatus }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      );
    } else {
      alert("Failed to update product visibility.");
    }

    setConfirmModal({ open: false, productId: null, newStatus: null });
  };

  const handleApplyFilters = () => {
    fetchProducts();
    setShowFilter(false);
  };

  const ownProducts = products.filter((p) => p.owner?.email === userEmail);
  const otherProducts = products.filter(
    (p) => p.owner?.email !== userEmail && p.isAvailable
  );

  return (
    <>
      <NavBar />
      <div>
        {/* Header & Search */}
        <div className="flex justify-between items-center mt-[110px] mb-6 max-w-[1200px] mx-auto w-full gap-3 relative">
          <h2 className="text-lg font-semibold text-black">Items</h2>

          <div className="flex items-center border border-[#ccc] rounded-[8px] w-[60%] px-0.5">
            <input
              className="flex-1 px-2 py-[10px] text-sm outline-none"
              placeholder="Search for anything..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              onClick={() => setShowFilter(!showFilter)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
            </button>

            <button
              onClick={fetchProducts}
              className="bg-[#325082] text-white px-4 py-[6px] rounded-md hover:opacity-90"
            >
              Search
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setHideMode(!hideMode)}
              className={`px-[16px] py-[10px] text-sm rounded-[8px] ${
                hideMode
                  ? "bg-yellow-600 text-white"
                  : "bg-[#325082] text-white"
              } hover:opacity-90`}
            >
              {hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Your Posts"}
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
                {/* Filter controls */}
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

        {/* --- Own Products --- */}
        {ownProducts.length > 0 && (
          <section className="max-w-[1200px] mx-auto mb-10">
            <h3 className="text-lg font-semibold mb-3">What you're selling</h3>
            <div className="relative">
              {/* Left Arrow */}
              <button
                onClick={() => {
                  document.getElementById("ownProductsScroll").scrollBy({
                    left: -256,
                    behavior: "smooth",
                  });
                }}
                className="absolute left-[-20px] top-1/2 transform -translate-y-1/2 w-10 h-10 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 hover:opacity-90 shadow"
              >
                ◀
              </button>

              {/* Scrollable Container */}
              <div
                id="ownProductsScroll"
                className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar"
              >
                {ownProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    isOwner
                    showHideMode={hideMode}
                    onToggleHide={(id, newStatus) =>
                      setConfirmModal({ open: true, productId: id, newStatus })
                    }
                  />
                ))}
              </div>

              {/* Right Arrow */}
              <button
                onClick={() => {
                  document.getElementById("ownProductsScroll").scrollBy({
                    left: 256,
                    behavior: "smooth",
                  });
                }}
                className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 w-10 h-10 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 hover:opacity-90 shadow"
              >
                ▶
              </button>
            </div>
          </section>
        )}

        {/* --- Other Products --- */}
        <section className="max-w-[1200px] mx-auto mb-5">
          <h3 className="text-lg font-semibold mb-3">What you can buy</h3>
          {otherProducts.length === 0 ? (
            <p className="text-center text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[20px]">
              {otherProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        message={
          confirmModal.newStatus
            ? "Are you sure you want to unhide this post?"
            : "Are you sure you want to hide this post?"
        }
        onConfirm={handleConfirmToggle}
        onCancel={() =>
          setConfirmModal({ open: false, productId: null, newStatus: null })
        }
      />
    </>
  );
}
