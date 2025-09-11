// app/buy/ProductsClient.js
"use client";

import { useEffect, useState, useTransition } from "react";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ActionButton";

const BS_CACHE_KEY = "buy:list:v1";

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
        BS_CACHE_KEY,
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
      const raw = sessionStorage.getItem(BS_CACHE_KEY);
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

  const otherProducts = products.filter(
    (p) => p.owner?.email !== userEmail && p.isAvailable
  );

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-4 mb-6 w-full">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 w-full gap-4">
          <div className="flex flex-col w-full sm:w-auto">
            <h2 className="text-lg font-semibold text-black hidden sm:block">
              Buy
            </h2>
          </div>

          {/* Search Bar */}
          <div className="flex items-center w-full sm:w-[50%] sm:ml-30 border border-gray-400 shadow-md rounded-[8px] px-[3.5px]">
            <input
              className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
              placeholder="Search for anything..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="shrink-0 p-2 hover:bg-gray-100 rounded-md"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => fetchProducts()}
              className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-md hover:opacity-90 text-sm"
            >
              Search
            </button>
          </div>

          {/* (Removed Sell button from here) */}

          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </div>

        {/* What you can buy */}
        <section>
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
    </>
  );
}
