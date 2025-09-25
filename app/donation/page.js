// app/donation/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ActionButton";

export default function DonationPage() {
  const [donations, setDonations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    category: "",
    condition: "",
    location: "",
  });

  const fetchDonations = async (nextFilters = filters, nextSearch = search) => {
    if (!donations.length) setLoading(true);

    try {
      const query = new URLSearchParams({
        search: nextSearch || "",
        category: nextFilters.category || "",
        condition: nextFilters.condition || "",
        location: nextFilters.location || "",
        type: "donation",
      });

      const res = await fetch(`/api/products?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      setDonations(data.products || data.items || []);
      setUserEmail(data.userEmail || "");
    } catch (e) {
      console.error("fetchDonations failed:", e);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleApplyFilters = () => setShowFilter(false);
  const handleClearFilters = () => {
    setFilters({
      category: "",
      condition: "",
      location: "",
    });
    setShowFilter(false);
  };

  // only show other people’s donations
  const otherDonations = donations.filter(
    (p) => p.owner?.email !== userEmail && (p.isAvailable ?? true)
  );

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-2.5 sm:px-3 mb-6 w-full">
        {/* Strict 25% / 50% / 25% layout to keep search perfectly centered */}
        <div className="grid grid-cols-1 sm:grid-cols-[25%_50%_25%] items-center gap-4 mb-4 w-full -mt-4.5 sm:mt-0">
          {/* Left (25%): Section title */}
          <div className="sm:justify-self-start">
            <h1 className="text-2xl font-bold text-[#325082] hidden sm:block">
              Donations
            </h1>
          </div>

          {/* Middle (50%): Centered Search (same styling as Buy) */}
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
                onClick={() => fetchDonations()}
                className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-90 text-sm"
              >
                Search
              </button>
            </div>
          </div>

          {/* Right (25%): Actions */}
          <div className="sm:justify-self-end w-full sm:w-auto">
            <div className="flex gap-2 sm:gap-3 justify-end">
              <Link href="/donation/mine">
                <ActionButton text="My Donations" variant="outlineHover" />
              </Link>
              <Link href="/donation/donate_now">
                <ActionButton text="+ Donate Items" variant="primaryClick" />
              </Link>
            </div>
          </div>

          {/* Filter Dropdown (shared with Buy styling/behavior) */}
          <FilterDropdown
            show={showFilter}
            filters={filters}
            setFilters={setFilters}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </div>

        {/* Grid (match Buy’s spacing & card variant) */}
        <section>
          <h3 className="text-lg font-semibold text-[#325082] mb-3">
            Available to Receive
          </h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading donations...</p>
          ) : otherDonations.length === 0 ? (
            <p className="text-center text-gray-500">No donations found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
              {otherDonations.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  variant="classicBlur"       // same look as Buy
                  isOwner={false}
                  currentUserEmail={userEmail}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
