"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import FilterDropdown from "@/components/FilterDropdown";
import ProductCard from "@/components/ProductCard";
import ConfirmModal from "@/components/ConfirmModal";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ActionButton";

export default function DonationPage() {
  const [donations, setDonations] = useState([]);
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [hideMode, setHideMode] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    donationId: null,
    newStatus: null,
  });

  const [filters, setFilters] = useState({
    category: "",
    //minPrice: "",       // kept for shared <FilterDropdown/> compatibility; backend can ignore
    //maxPrice: "",       // kept for shared <FilterDropdown/> compatibility; backend can ignore
    condition: "",
    location: "",
    //recipientNote: "",
  });

  const fetchDonations = async () => {
  setLoading(true);
  try {
    const query = new URLSearchParams({
      search: search || "",
      category: filters.category || "",
      // minPrice: filters.minPrice || "",
      // maxPrice: filters.maxPrice || "",
      condition: filters.condition || "",
      location: filters.location || "",
      // recipientNote: filters.recipientNote || "",
      type: "donation", // only donations
    });

    const res = await fetch(`/api/products?${query.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();

    setDonations(data.products || data.items || []); // your /api/products returns { products }
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
  }, [filters]);

  const handleConfirmToggle = async () => {
    const { donationId, newStatus } = confirmModal;
    // newStatus from modal means "unhide?" — mirror your original logic:
    const wantHidden = !newStatus;

    const res = await fetch(`/api/donations/${donationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: wantHidden }),
    });

    if (res.ok) {
      const updated = await res.json();
      setDonations((prev) =>
        prev.map((d) => (d._id === updated._id ? updated : d))
      );
    } else {
      alert("Failed to update donation visibility.");
    }

    setConfirmModal({ open: false, donationId: null, newStatus: null });
  };

  const handleApplyFilters = () => setShowFilter(false);

  const handleClearFilters = () => {
    setFilters({
      category: "",
      //minPrice: "",
      //maxPrice: "",
      condition: "",
      location: "",
      //recipientNote: "", // bugfix: ensure this resets too
    });
    setShowFilter(false);
  };

  const ownDonations = donations.filter((i) => i.owner?.email === userEmail);
  const otherDonations = donations.filter(
    (i) => i.owner?.email !== userEmail && (i.isAvailable ?? true)
  );

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-4 w-full">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-[98px] mb-6 w/full gap-4">
          {/* Left: Title & Mobile Buttons */}
          <div className="flex flex-col w-full sm:w-auto">
            <h2 className="text-lg font-semibold text-black hidden sm:block">
              Donations
            </h2>

            {/* Mobile Buttons */}
            <div className="flex justify-between items-center sm:hidden w-full mt-2">
              <ActionButton
                text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Donations"}
                variant={hideMode ? "outlineClick" : "primaryClick"}
                onClick={() => setHideMode(!hideMode)}
                className="text-sm px-2 py-1 min-w-[80px]"
              />
              <Link href="/donation/donate_now">
                <ActionButton
                  text="+ Donate Items"
                  variant="primaryClick"
                  className="text-sm px-2 py-1 min-w-[80px]"
                />
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center w-full sm:w-[50%] sm:ml-30 border border-gray-400 shadow-md rounded-[8px] px-[2.5px]">
            <input
              className="flex-1 px-2 py-[10px] text-sm outline-none"
              placeholder="Search donated items..."
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
              onClick={fetchDonations}
              className="bg-[#325082] text-white px-4 py-[6px] rounded-md hover:opacity-90"
            >
              Search
            </button>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden sm:flex gap-3 w-full sm:w-auto justify-end">
            <ActionButton
              text={hideMode ? "Cancel Hide/Unhide" : "Hide/Unhide Donations"}
              variant={hideMode ? "outlineClick" : "primaryClick"}
              onClick={() => setHideMode(!hideMode)}
            />
            <Link href="/donation/donate_now">
              <ActionButton text="+ Donate Items" variant="primaryClick" />
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

        {/* Own Donations Section */}
        <section className="mb-10">
          <h3 className="text-lg font-semibold mb-3">Items you are donating</h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading your donations...</p>
          ) : ownDonations.length === 0 ? (
            <p className="text-center text-gray-500">
              You have no active donations right now.
            </p>
          ) : (
            <div className="relative w-full">
              {/* Left Arrow */}
              {ownDonations.length > 4 && (
                <button
                  onClick={() => {
                    document.getElementById("ownDonationsScroll").scrollBy({
                      left: -256,
                      behavior: "smooth",
                    });
                  }}
                  className="absolute left-1 top-1/2 transform -translate-y-1/2 -translate-x-1/2
                           w-9 h-9 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.08] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ❮
                </button>
              )}

              {/* Scrollable Container */}
              <div
                id="ownDonationsScroll"
                className="flex w-full gap-3 overflow-x-auto scroll-smooth no-scrollbar overflow-visible"
              >
                {ownDonations.map((item) => (
                  <ProductCard
                    key={item._id}
                    product={item}
                    isOwner
                    showHideMode={hideMode}
                    // reuse your existing toggle confirmation path
                    onToggleHide={(id, newStatus) =>
                      setConfirmModal({ open: true, donationId: id, newStatus })
                    }
                    mode="donation" // optional: if your card tweaks UI per mode
                  />
                ))}
              </div>

              {/* Right Arrow */}
              {ownDonations.length > 4 && (
                <button
                  onClick={() => {
                    document.getElementById("ownDonationsScroll").scrollBy({
                      left: 256,
                      behavior: "smooth",
                    });
                  }}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 translate-x-1/2
                           w-9 h-9 bg-[#325082] text-white rounded-full flex items-center justify-center z-10 transition-all duration-500 ease-in-out hover:scale-[1.08] active:scale-[0.8] shadow-lg shadow-gray-600"
                >
                  ❯
                </button>
              )}
            </div>
          )}
        </section>

        {/* Other Donations Section */}
        <section className="mb-5">
          <h3 className="text-lg font-semibold mb-3">Available to receive</h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading donations...</p>
          ) : otherDonations.length === 0 ? (
            <p className="text-center text-gray-500">No donations found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-[426px]:gap-[12px]">
              {otherDonations.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  isOwner={false}
                  mode="donation" // optional prop for the card
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
            ? "Are you sure you want to unhide this donation?"
            : "Are you sure you want to hide this donation?"
        }
        onConfirm={handleConfirmToggle}
        onCancel={() =>
          setConfirmModal({ open: false, donationId: null, newStatus: null })
        }
      />
    </>
  );
}
