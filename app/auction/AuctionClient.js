// app/auction/AuctionClient.js
"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";
import {
  AdjustmentsHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const AUCTION_CACHE_KEY = "auction:list:v1";

function isEnded(p) {
  if (!p?.auctionEndsAt) return false;
  const t = new Date(p.auctionEndsAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export default function AuctionClient({ initial }) {
  const [products, setProducts] = useState(initial?.products || []);
  const [userEmail, setUserEmail] = useState(initial?.userEmail || "");
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(!initial?.products?.length);
  const [guardOpen, setGuardOpen] = useState(false);
  const scrollRef = useRef(null);

  const [filters, setFilters] = useState({
    category: "",
    condition: "",
    location: "",
  });

  const [isPending, startTransition] = useTransition();

  const fetchProducts = async (nextFilters = filters, nextSearch = search) => {
    if (!products.length) setLoading(true);

    const query = new URLSearchParams({
      search: nextSearch,
      category: nextFilters.category,
      condition: nextFilters.condition,
      location: nextFilters.location,
      type: "auction",
    });

    const res = await fetch(`/api/products?${query.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();

    setProducts(data.products || []);
    setUserEmail(data.userEmail || "");
    setLoading(false);

    try {
      sessionStorage.setItem(
        AUCTION_CACHE_KEY,
        JSON.stringify({
          products: data.products,
          userEmail: data.userEmail,
          ts: Date.now(),
        }),
      );
    } catch {}
  };

  useEffect(() => {
    let seeded = false;
    try {
      const raw = sessionStorage.getItem(AUCTION_CACHE_KEY);
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
    setFilters({ category: "", condition: "", location: "" });
    setShowFilter(false);
  };

  const myAuctions = products.filter((p) => p.owner?.email === userEmail);

  // ✅ show only active auctions from others
  const otherAuctions = products.filter((p) => {
    const isMine = p.owner?.email === userEmail;
    if (isMine) return false;
    if (!p.isAvailable) return false;
    if (isEnded(p)) return false;
    return true;
  });

  function onAuctionClick() {
    if (initial?.auctionGuard?.ok) {
      window.location.href = "/auction/post";
      return;
    }
    setGuardOpen(true);
  }

  function smoothScrollBy(distance, duration = 450) {
    if (!scrollRef.current) return;
    const element = scrollRef.current;
    const start = element.scrollLeft;
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      element.scrollLeft = start + distance * ease;
      if (elapsed < duration) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-3 mb-6 w-full">
        {/* 25% / 50% / 25% layout */}
        <div className="grid grid-cols-1 sm:grid-cols-[25%_50%_25%] items-center gap-4 mb-4 w-full -mt-4.5 sm:mt-0">
          <div className="sm:justify-self-start">
            <h1 className="text-2xl font-bold text-[#325082] hidden sm:block">
              Auction
            </h1>
          </div>

          {/* Search */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px]">
              <input
                className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
                placeholder="Search auction items..."
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
                className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-90 text-sm"
              >
                Search
              </button>
            </div>
          </div>

          <div className="hidden sm:block" />

          {/* Filter Dropdown */}
          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isAuctionPage={true}
          />
        </div>

        {/* My Auctions */}
        <section className="mb-6 relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#325082]">
              My Auction Posts
            </h3>

            <ActionButton
              text="+ Auction Your Items"
              variant="primaryClick"
              onClick={onAuctionClick}
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-400">Loading your posts...</p>
          ) : myAuctions.length === 0 ? (
            <p className="text-gray-500">
              You haven&apos;t posted any auctions yet.
            </p>
          ) : (
            <div className="relative">
              {myAuctions.length > 4 && (
                <button
                  onClick={() => smoothScrollBy(-252, 450)}
                  className="absolute left-[-12px] top-1/2 -translate-y-1/2 bg-[#325082] shadow-md rounded-full p-2 z-10 hover:bg-[#153969] hidden sm:flex items-center justify-center transition-all duration-500 hover:scale-[1.08]"
                  aria-label="Scroll left"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-white" />
                </button>
              )}

              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto no-scrollbar"
              >
                {myAuctions.map((product) => (
                  <div key={product._id} className="w-[240px] shrink-0">
                    <ProductCard
                      product={product}
                      variant="classicBlur"
                      isOwner={true}
                      currentUserEmail={userEmail}
                    />
                  </div>
                ))}
              </div>

              {myAuctions.length > 4 && (
                <button
                  onClick={() => smoothScrollBy(252, 450)}
                  className="absolute right-[-12px] top-1/2 -translate-y-1/2 bg-[#325082] shadow-md rounded-full p-2 z-10 hover:bg-[#153969] hidden sm:flex items-center justify-center transition-all duration-500 hover:scale-[1.08]"
                  aria-label="Scroll right"
                >
                  <ChevronRightIcon className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
          )}
        </section>

        {/* Others */}
        <section>
          <h3 className="text-lg font-semibold text-[#325082] mb-3">
            Active Auctions from Others
          </h3>

          {loading ? (
            <p className="text-center text-gray-400">Loading auctions...</p>
          ) : otherAuctions.length === 0 ? (
            <p className="text-center text-gray-500">
              No active auctions found.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
              {otherAuctions.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  variant="classicBlur"
                  isOwner={false}
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
          `Before posting an auction, please add the following in your profile:\n\n` +
          (initial?.auctionGuard?.missing?.length
            ? "• " + initial.auctionGuard.missing.join("\n• ")
            : "—") +
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
