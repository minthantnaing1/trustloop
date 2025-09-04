// app/buy-sell/[id]/checkout/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ConfirmOrderButton from "@/components/ConfirmOrderButton";

export default async function CheckoutPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();

  // Fetch product
  const prodRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
  );
  if (!prodRes.ok) return <div>Product not found.</div>;
  const product = await prodRes.json();

  // Fetch me (to prefill location from User.location)
  let userLocation = "";
  if (session) {
    try {
      const meRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/me`,
        { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
      );
      if (meRes.ok) {
        const me = await meRes.json();
        userLocation = me?.location || "";
      }
    } catch {
      // ignore – show empty input if fetch fails
    }
  }

  const fee = Number(process.env.PLATFORM_FEE || 10);
  const price = Number(product.price || 0);
  const total = price + fee;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-4 w-full overflow-x-hidden">
        {/* Header */}
        <h1 className="text-2xl font-bold text-[#325082] mb-4">Checkout</h1>

        {/* Progress Stepper */}
        <div className="mb-5">
          <ol className="flex items-center text-sm">
            <li className="flex items-center font-semibold text-[#325082]">
              <span className="w-6 h-6 rounded-full bg-[#325082] text-white flex items-center justify-center text-xs mr-2">
                1
              </span>
              Review
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                2
              </span>
              Pay & Upload
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                3
              </span>
              Deliver
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                4
              </span>
              Payout
            </li>
          </ol>
        </div>

        {/* Content */}
        <div className="bg-white border rounded-2xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: product details */}
            <div className="flex-1">
              <div className="flex gap-4">
                <img
                  src={
                    product.defaultImage ||
                    product.images?.[0] ||
                    "/placeholder.png"
                  }
                  alt={product.title}
                  className="w-[160px] h-[160px] rounded-xl object-cover border"
                />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#1f2f4c]">
                    {product.title}
                  </h2>
                  <p className="text-[#1f2f4c] mt-1 font-medium">
                    {price.toLocaleString()} ฿
                  </p>

                  <div className="mt-2 text-sm text-gray-600">
                    <div>
                      Seller:{" "}
                      <span className="font-medium text-[#1f2f4c]">
                        {product.owner?.name || "-"}
                      </span>
                    </div>
                    <div className="mt-1">
                      Category:{" "}
                      <span className="text-gray-700">
                        {product.category || "-"}
                      </span>
                    </div>
                    <div className="mt-1">
                      Default Meetup (from listing):{" "}
                      <span className="text-gray-700">
                        {product.location || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Trust badge */}
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e9eff7] border border-[#cdd9ef] text-[#325082] text-xs font-medium">
                    <span>🔒 Secure Escrow by TrustLoop</span>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#325082] mb-2">
                  What happens next
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>
                    We’ll create the order and move you to the payment page.
                  </li>
                  <li>Pay to the admin account and upload your receipt.</li>
                  <li>Seller delivers or meets you; you confirm receipt.</li>
                  <li>Admin releases payout to the seller.</li>
                </ul>
              </div>
            </div>

            {/* Right: order summary + method/location */}
            <div className="w-full lg:w-[420px]">
              <div className="rounded-xl border overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#f3f6fb] to-white">
                  <h3 className="font-semibold text-[#325082]">
                    Order Summary
                  </h3>
                </div>

                <form id="checkoutForm" className="p-4 space-y-4">
                  {/* Method */}
                  <fieldset className="border rounded-lg p-3">
                    <legend className="text-xs font-semibold text-[#325082] px-1">
                      Fulfillment Method
                    </legend>
                    <div className="flex items-center gap-4 mt-1">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="method"
                          value="MEETUP"
                          defaultChecked
                          className="accent-[#325082]"
                        />
                        <span className="text-sm">Meetup</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name="method"
                          value="DELIVERY"
                          className="accent-[#325082]"
                        />
                        <span className="text-sm">Delivery</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Meetup time can be discussed after seller accepts the
                      order.
                    </p>
                  </fieldset>

                  {/* Location / Address */}
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Location / Address for this order
                    </label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={userLocation}
                      placeholder='e.g., "AU Dorm 2" or "Bangna Campus"'
                      className="w-full rounded-lg border border-[#dbe6ff] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#325082]/30"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Prefilled from your profile (
                      <span className="font-medium">User Location</span>). You
                      can customize it for this order.
                    </p>
                  </div>

                  {/* Totals */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[15px]">
                      <span>Item Price</span>
                      <span>{price.toLocaleString()} ฿</span>
                    </div>
                    <div className="flex justify-between text-[15px] mt-1">
                      <span>Platform Fee</span>
                      <span>{fee.toLocaleString()} ฿</span>
                    </div>
                    <div className="my-3 border-t" />
                    <div className="flex justify-between font-bold text-[#1f2f4c]">
                      <span>Total</span>
                      <span>{total.toLocaleString()} ฿</span>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div className="mt-2">
                    {session ? (
                      <ConfirmOrderButton
                        productId={product._id}
                        formId="checkoutForm"
                      />
                    ) : (
                      <Link
                        href="/"
                        className="block text-center bg-gray-300 text-gray-600 px-4 py-2 rounded-md cursor-not-allowed"
                      >
                        Sign in to continue
                      </Link>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    By confirming, you agree to TrustLoop’s escrow process.
                    You’ll pay on the next screen and upload a receipt. Funds
                    are held until you confirm you’ve received the item.
                  </p>
                </form>
              </div>

              <Link
                href={`/buy-sell/${product._id}`}
                className="block text-center text-sm text-[#325082] hover:underline mt-4"
              >
                ← Back to Product
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
