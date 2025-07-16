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
      <div>
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center max-md:ml-2 max-[1025px]:ml-8 mt-[110px] mb-6 max-w-[1200px] mx-auto w-full gap-3 relative">
          {/* Title + Buttons (Only affected in mobile) */}
          <div className="flex justify-between items-center w-full sm:w-auto">
            <h2 className="text-lg font-semibold text-black">Products</h2>

            <div className="flex gap-2 ml-auto sm:hidden">
              <ActionButton
                text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Selling"}
                variant={hideMode ? "outlineClick" : "primaryClick"}
                onClick={() => setHideMode(!hideMode)}
              />

              <Link href="/sell">
                <ActionButton text="+ Sell Your Items" variant="primaryClick" />
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center border border-gray-400 shadow-md rounded-[8px] w-full sm:w-[50%] px-0.5 sm:ml-[160px] mt-3 sm:mt-0">
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
          <div className="hidden sm:flex flex-row gap-3 w-full sm:w-auto justify-end items-end max-[1025px]:mr-6">
            <ActionButton
              text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Selling"}
              variant={hideMode ? "outlineClick" : "primaryClick"}
              onClick={() => setHideMode(!hideMode)}
            />

            <Link href="/sell" className="w-full sm:w-auto">
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

        {/* --- Own Products --- */}
        <section className="max-w-[1200px] max-[1025px]:ml-8 max-[1025px]:mr-[-10px] max-md:ml-2 max-md:mr-[-8px] mx-auto mb-10">
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
            <div className="relative">
              {/* Left Arrow */}
              {ownProducts.length > 4 && (
                <button
                  onClick={() => {
                    document.getElementById("ownProductsScroll").scrollBy({
                      left: -256,
                      behavior: "smooth",
                    });
                  }}
                  className="absolute left-[-20px] top-1/2 transform -translate-y-1/2 w-9 h-9 max-md:ml-3 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.1] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ◀
                </button>
              )}

              {/* Scrollable Container */}
              <div
                id="ownProductsScroll"
                className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar overflow-visible"
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
                  className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 w-9 h-9 max-md:mr-3 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.1] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ▶
                </button>
              )}
            </div>
          )}
        </section>

        {/* --- Other Products --- */}
        <section className="max-w-[1200px] max-[1025px]:ml-8 max-[1025px]:mr-[-20px] max-md:ml-2 mx-auto mb-5">
          <h3 className="text-lg font-semibold mb-3">What you can buy</h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading products...</p>
          ) : otherProducts.length === 0 ? (
            <p className="text-center text-gray-500">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[16px] max-[1025px]:gap-[4px]">
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
