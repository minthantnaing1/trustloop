// app/donation/mine/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ProductCard from "@/components/ProductCard";
import ActionButton from "@/components/ActionButton";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

export default function MyDonationsPage() {
  const [donations, setDonations] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMyDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?type=donation`, {
        cache: "no-store",
      });
      const data = await res.json();

      const email = data.userEmail || "";
      setUserEmail(email);

      const mine = (data.products || data.items || []).filter(
        (p) => p?.owner?.email === email
      );
      setDonations(mine);
    } catch (e) {
      console.error("fetchMyDonations failed:", e);
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  return (
    <>
      <NavBar />

      <div className="max-w-[1200px] mx-auto px-2.5 sm:px-3 mb-6 w-full">
        {/* Strict 25% / 50% / 25% layout for consistent UI */}
        <div className="grid grid-cols-1 sm:grid-cols-[25%_50%_25%] items-center gap-4 mb-4 w-full -mt-4.5 sm:mt-0">
          {/* Left (25%): Section title & back link */}
          <div className="sm:justify-self-start flex items-center gap-3">
            <Link
              href="/donation"
              className="text-[#325082] text-sm hover:underline"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-[#325082] hidden sm:block">
              My Donations
            </h1>
          </div>

          {/* Middle (50%): Placeholder search to stay symmetric */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center w-full border border-gray-200 shadow-sm rounded-[6px] px-[3.5px] bg-gray-50">
              <input
                disabled
                className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none bg-gray-50 text-gray-400 cursor-not-allowed"
                placeholder="Search not available on this page"
              />
              <button
                disabled
                className="shrink-0 p-2 rounded-md text-gray-300 cursor-not-allowed"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
              </button>
              <button
                disabled
                className="shrink-0 bg-gray-300 text-white px-4 py-[7px] rounded-[3px] text-sm cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>

          {/* Right (25%): Actions */}
          <div className="sm:justify-self-end w-full sm:w-auto">
            <div className="flex gap-2 sm:gap-3 justify-end">
              <ActionButton
                text="Refresh"
                variant="outlineHover"
                onClick={fetchMyDonations}
              />
              <Link href="/donation/donate_now">
                <ActionButton text="+ Donate Items" variant="primaryClick" />
              </Link>
            </div>
          </div>
        </div>

        {/* Grid */}
        <section>
          <h3 className="text-lg font-semibold text-[#325082] mb-3">
            Items You Are Donating
          </h3>
          {loading ? (
            <p className="text-center text-gray-400">Loading your donations...</p>
          ) : donations.length === 0 ? (
            <p className="text-center text-gray-500">
              You haven&apos;t donated any items yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-[426px]:gap-[8px]">
              {donations.map((item) => (
                <ProductCard
                  key={item._id}
                  product={item}
                  isOwner
                  currentUserEmail={userEmail}
                  variant="classicBlur"   // match Buy/Donation style
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
