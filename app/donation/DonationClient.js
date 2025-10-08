"use client";

import { useEffect, useState, useTransition } from "react";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import ActionButton from "@/components/ActionButton";
import ConfirmModal from "@/components/ConfirmModal";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

const DONATION_CACHE_KEY = "donation:list:v1";

export default function DonationClient({ initial }) {
  const [products, setProducts] = useState(initial?.products || []);
  const [userEmail, setUserEmail] = useState(initial?.userEmail || "");
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(!initial?.products?.length);
  const [guardOpen, setGuardOpen] = useState(false);

  const [filters, setFilters] = useState({
    category: "",
    condition: "",
    location: "",
    donationMode: "",
  });

  const [isPending, startTransition] = useTransition();

  const fetchProducts = async (nextFilters = filters, nextSearch = search) => {
    if (!products.length) setLoading(true);

    const query = new URLSearchParams({
      search: nextSearch,
      category: nextFilters.category,
      condition: nextFilters.condition,
      location: nextFilters.location,
      type: "donation",
      donationMode: nextFilters.donationMode || "",
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
        DONATION_CACHE_KEY,
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
      const raw = sessionStorage.getItem(DONATION_CACHE_KEY);
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
      condition: "",
      location: "",
      donationMode: "",
    });
    setShowFilter(false);
  };

  // Split into "my donations" (show first, horizontal scroll) and "others"
  const myDonations = products.filter((p) => p.owner?.email === userEmail);
  const otherDonations = products.filter(
    (p) => p.owner?.email !== userEmail && p.isAvailable
  );

  function onDonateClick() {
    if (initial?.donateGuard?.ok) {
      window.location.href = "/donation/post";
      return;
    }
    setGuardOpen(true);
  }

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-3 mb-6 w-full">
        {/* Strict 25% / 50% / 25% layout, matching Buy page */}
        <div className="grid grid-cols-1 sm:grid-cols-[25%_50%_25%] items-center gap-4 mb-4 w-full -mt-4.5 sm:mt-0">
          {/* Left (25%): Section title */}
          <div className="sm:justify-self-start">
            <h1 className="text-2xl font-bold text-[#325082] hidden sm:block">
              Donation
            </h1>
          </div>

          {/* Middle (50%): Centered Search */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px]">
              <input
                className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
                placeholder="Search donated items..."
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

          {/* Right (25%): Spacer */}
          <div className="hidden sm:block" />

          {/* Filter Dropdown */}
          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
            isDonationPage={true}
          />
        </div>

        {/* My Donations - Horizontal scroll row */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#325082]">
              My Donation Posts
            </h3>

            {/* Match Sell Page Button */}
            <ActionButton
              text="+ Donate Your Items"
              variant="primaryClick"
              onClick={onDonateClick}
            />
          </div>

          {loading ? (
            <p className="text-center text-gray-400">Loading your posts...</p>
          ) : myDonations.length === 0 ? (
            <p className="text-gray-500">
              You haven&apos;t posted any donations yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-3 min-w-full w-max">
                {myDonations.map((product) => (
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
            </div>
          )}
        </section>

        {/* Others' Donations - Grid like Buy page */}
        <section>
          <h3 className="text-lg font-semibold text-[#325082] mb-3">
            Available Donations from Others
          </h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading donations...</p>
          ) : otherDonations.length === 0 ? (
            <p className="text-center text-gray-500">No donations found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
              {otherDonations.map((product) => (
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
          `Before posting a donation, please add the following in your profile:\n\n` +
          (initial?.donateGuard?.missing?.length
            ? "• " + initial.donateGuard.missing.join("\n• ")
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
