"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import ConfirmModal from "@/components/ConfirmModal";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ActionButton";

export default function BuySellPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [hideMode, setHideMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
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
    setLoading(true); // Start loading

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

    setLoading(false); // Done loading
  };

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const handleConfirmToggle = async () => {
    const { productId, newStatus } = confirmModal;

    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: newStatus, isHidden: !newStatus }),
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
    setShowFilter(false);
  };

  const handleClearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      condition: "",
      location: "",
    });
    setShowFilter(false);
  };

  const ownProducts = products.filter((p) => p.owner?.email === userEmail);
  const otherProducts = products.filter(
    (p) => p.owner?.email !== userEmail && p.isAvailable
  );

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-4 w-full">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-[110px] mb-6 w-full gap-4">
          {/* Left: Title & Mobile Buttons */}
          <div className="flex flex-col w-full sm:w-auto">
            <h2 className="text-lg font-semibold text-black hidden sm:block">
              Products
            </h2>

            {/* Mobile Buttons */}
            <div className="flex justify-between items-center sm:hidden w-full mt-2">
              <ActionButton
                text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Selling"}
                variant={hideMode ? "outlineClick" : "primaryClick"}
                onClick={() => setHideMode(!hideMode)}
                className="text-sm px-2 py-1 min-w-[80px]"
              />
              <Link href="/sell">
                <ActionButton
                  text="+ Sell Your Items"
                  variant="primaryClick"
                  className="text-sm px-2 py-1 min-w-[80px]"
                />
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center w-full sm:w-[50%] border border-gray-400 shadow-md rounded-[8px] px-[2.5px]">
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

          {/* Desktop Buttons */}
          <div className="hidden sm:flex gap-3 w-full sm:w-auto justify-end">
            <ActionButton
              text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Selling"}
              variant={hideMode ? "outlineClick" : "primaryClick"}
              onClick={() => setHideMode(!hideMode)}
            />
            <Link href="/sell">
              <ActionButton text="+ Sell Your Items" variant="primaryClick" />
            </Link>
          </div>

          {/* Filter Dropdown */}
          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </div>

        {/* Own Products Section */}
        <section className="mb-10">
          <h3 className="text-lg font-semibold mb-3">Items you are selling</h3>
          {loading ? (
            <p className="text-center text-gray-400">
              Loading your products...
            </p>
          ) : ownProducts.length === 0 ? (
            <p className="text-center text-gray-500">
              You are not selling any items right now.
            </p>
          ) : (
            <div className="relative w-full">
              {/* Left Arrow */}
              {ownProducts.length > 4 && (
                <button
                  onClick={() => {
                    document.getElementById("ownProductsScroll").scrollBy({
                      left: -256,
                      behavior: "smooth",
                    });
                  }}
                  className="absolute left-1 top-1/2 transform -translate-y-1/2 -translate-x-1/2
                         w-9 h-9 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.08] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ◀
                </button>
              )}

              {/* Scrollable Container */}
              <div
                id="ownProductsScroll"
                className="flex w-full gap-3 overflow-x-auto scroll-smooth no-scrollbar overflow-visible"
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
              {ownProducts.length > 4 && (
                <button
                  onClick={() => {
                    document.getElementById("ownProductsScroll").scrollBy({
                      left: 256,
                      behavior: "smooth",
                    });
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 translate-x-1/2
                         w-9 h-9 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.08] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ▶
                </button>
              )}
            </div>
          )}
        </section>

        {/* Other Products Section */}
        <section className="mb-5">
          <h3 className="text-lg font-semibold mb-3">What you can buy</h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading products...</p>
          ) : otherProducts.length === 0 ? (
            <p className="text-center text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-[426px]:gap-[12px]">
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
