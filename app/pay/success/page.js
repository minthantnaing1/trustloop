"use client";
import Link from "next/link";

export default function PaySuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold mt-4 text-gray-800">
          Payment Successful 🎉
        </h1>
        <p className="text-gray-600 mt-3">
          Your payment is secured in TrustLoop escrow. The seller will proceed
          with delivery or meetup shortly.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/my-orders">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold">
              Go to My Orders
            </button>
          </Link>

          <Link href="/">
            <button className="w-full border border-gray-300 py-3 rounded-xl text-gray-700">
              Return Home
            </button>
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Payment confirmation is processed securely via Stripe.
        </p>
      </div>
    </div>
  );
}
