"use client";
import Link from "next/link";

export default function PayCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold mt-4 text-gray-800">
          Payment Not Completed and Order has been Cancelled
        </h1>
        <div className="mt-8 space-y-3">
          <Link href="/my-orders">
            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold">
              Go to My Orders
            </button>
          </Link>

          <Link href="/">
            <button className="w-full border border-gray-300 py-3 rounded-xl text-gray-700">
              Continue Browsing
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
