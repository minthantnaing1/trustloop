// app/sell/ProductsClient.js
"use client";

import { useEffect, useState, useTransition } from "react";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal"; // ← add

const SELL_CACHE_KEY = "sell:list:mine:v1";

export default function ProductsClient({ initial }) {
  const [products, setProducts] = useState(initial?.products || []);
  const [userEmail, setUserEmail] = useState(initial?.userEmail || "");
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(!initial?.products?.length);

  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    condition: "",
    location: "",
  });

  const [isPending, startTransition] = useTransition();

  // ▼ modal state for profile guard
  const [guardOpen, setGuardOpen] = useState(false);
  const missing = initial?.sellGuard?.missing || [];

  const fetchProducts = async (nextFilters = filters, nextSearch = search) => {
    if (!products.length) setLoading(true);

    const query = new URLSearchParams({
      search: nextSearch,
      category: nextFilters.category,
      minPrice: nextFilters.minPrice,
      maxPrice: nextFilters.maxPrice,
      condition: nextFilters.condition,
      location: nextFilters.location,
      type: "sell",
    });

    const res = await fetch(`/api/products?${query.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();

    setProducts(data.products);
    setUserEmail(data.userEmail);
    setLoading(false);

    try {
      sessionStorage.setItem(
        SELL_CACHE_KEY,
        JSON.stringify({
          products: data.products,
          userEmail: data.userEmail,
          ts: Date.now(),
        })
      );
    } catch {}
  };

  useEffect(() => {
    let seeded = false;
    try {
      const raw = sessionStorage.getItem(SELL_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached.products)) {
          setProducts(cached.products);
          setUserEmail(cached.userEmail || "");
          setLoading(false);
          seeded = true;
        }
      }
    } catch {}

    if (!seeded && !initial?.products?.length) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => fetchProducts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleApplyFilters = () => setShowFilter(false);

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

  // ▼ sell button click
  function onSellClick() {
    if (initial?.sellGuard?.ok) {
      window.location.href = "/sell/post";
      return;
    }
    setGuardOpen(true);
  }

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-3 mb-6 w-full">
        {/* Header as strict 25% / 50% / 25% grid to keep search perfectly centered */}
        <div className="grid grid-cols-1 sm:grid-cols-[25%_50%_25%] items-center gap-4 mb-2 w-full -mt-4.5 sm:mt-0">
          <div className="sm:justify-self-start">
            <h1 className="text-2xl font-bold text-[#325082] hidden sm:block">
              Sell
            </h1>
          </div>

          <div className="sm:justify-self-center w-full">
            <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px]">
              <input
                className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
                placeholder="Search your listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="shrink-0 p-2 hover:bg-gray-100 rounded-md"
                aria-label="Open filters"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => fetchProducts()}
                className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-95 text-sm"
              >
                Search
              </button>
            </div>
          </div>

          <div className="hidden sm:block" />

          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#325082]">
              My Selling Items
            </h3>

            {/* Was <Link><ActionButton/></Link> —> avoid nested button */}
            <ActionButton
              text="+ Sell Your Items"
              variant="primaryClick"
              onClick={onSellClick}
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-400">
              Loading your products...
            </p>
          ) : ownProducts.length === 0 ? (
            <div className="text-center text-gray-500">
              <p>You are not selling any items right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
              {ownProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  variant="classicBlur"
                  isOwner
                  currentUserEmail={userEmail}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Profile requirement modal */}
      <ConfirmModal
        isOpen={guardOpen}
        message={
          `Before posting a product, please add the following in your profile:\n\n` +
          (missing.length ? "• " + missing.join("\n• ") : "—") +
          `\n\nYou'll be redirected to update them.`
        }
        onCancel={() => setGuardOpen(false)}
        onConfirm={() => {
          setGuardOpen(false);
          window.location.href = "/profile/edit";
        }}
        variant="default"
      />
    </>
  );
}
