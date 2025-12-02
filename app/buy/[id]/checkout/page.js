// app/buy/[id]/checkout/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ConfirmOrderButton from "@/components/ConfirmOrderButton";
import Stepper from "@/components/Stepper";
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation"; // ⬅️ add this

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

  // 🚫 Gate: if product is not available, do not allow checkout
  // (available again only if cancelled/rejected/expired)
  if (product.isAvailable === false) {
    return redirect(`/buy/${id}`);
  }

  // Fetch me (to prefill location from User.location)
  let userLocation = "";
  let userPhone = "";
  let userDefaultScanCode = "";
  if (session) {
    try {
      const meRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/me`,
        { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
      );
      if (meRes.ok) {
        const { user } = await meRes.json();
        userLocation = user?.location || "";
        userPhone = user?.phone || "";
        userDefaultScanCode = user?.defaultScanCode || "";
      }
    } catch {
      // ignore – show empty input if fetch fails
    }
  }

  // 🚫 Gate: require Phone + Location to reach checkout
  if (!userPhone || !userLocation || !userDefaultScanCode) {
    return redirect(`/buy/${id}`); // product page will pop modal to set missing info
  }

  const price = Number(product.price || 0);

  // Platform fee = 5% of product price
  const feeRate = 0.05;
  const fee = Math.round(price * feeRate); // round to nearest baht

  const total = price + fee;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Checkout</h1>
          <BackButton />
        </div>

        {/* Progress Stepper (buyer, step 1) */}
        <div className="mb-5">
          <Stepper current={1} variant="buyer" className="px-1" />
        </div>

        {/* Content */}
        <div className="bg-white border border-gray-300 rounded-[5px] shadow-xl p-6">
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
                  className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] rounded-[5px] object-cover border border-gray-300 shadow-sm"
                />
                <div className="flex-1 flex flex-col justify-start">
                  <h2 className="text-lg font-bold text-[#1f2f4c]">
                    {product.title}
                  </h2>
                  <p className="text-[#1f2f4c] mt-1 font-semibold">
                    {price.toLocaleString()} ฿
                  </p>

                  <div className="mt-2 text-[14px] text-gray-600">
                    <div>
                      Seller:{" "}
                      <span className="font-semibold text-[#1f2f4c]">
                        {product.owner?.name || "-"}
                      </span>
                    </div>
                    <div className="mt-1">
                      Category:{" "}
                      <span className="font-semibold text-gray-700">
                        {product.category || "-"}
                      </span>
                    </div>
                    <div className="mt-1">
                      Condition:{" "}
                      <span className="font-semibold text-gray-700">
                        {product.condition || "-"}
                      </span>
                    </div>
                    <div className="mt-1">
                      Product Location:{" "}
                      <span className="font-semibold text-gray-700">
                        {product.location || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust badge */}
              <div className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2 rounded-[5px] bg-[#e9eff7] border border-[#cdd9ef] text-[#325082] text-xs font-semibold">
                <span>🔒 Secure Escrow by TrustLoop</span>
              </div>

              {/* What happens on this page */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#325082] mb-2">
                  Steps on this page
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>
                    Select your preferred delivery method (meetup or delivery).
                  </li>
                  <li>Fill or choose your meetup / delivery location.</li>
                  <li>Review the order details and confirm your order.</li>
                </ul>
              </div>

              {/* What happens next */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#325082] mb-2">
                  What happens next
                </h3>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  <li>
                    We&apos;ll create the order and move you to the payment
                    page.
                  </li>
                  <li>
                    Pay to the admin account and upload your payment slip.
                  </li>
                  <li>
                    Seller delivers or meets you; you confirm received the item.
                  </li>
                  <li>Admin releases payout to the seller.</li>
                </ul>
              </div>
            </div>

            {/* Right: order summary + method/location */}
            <div className="w-full lg:w-[460px]">
              <div className="rounded-[5px] border border-gray-300 shadow-md overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#f3f6fb] to-white">
                  <h3 className="font-semibold text-[#325082]">
                    Order Summary
                  </h3>
                </div>

                <form id="checkoutForm" className="p-4 space-y-4">
                  {/* Method */}
                  <fieldset className="rounded-[5px] border border-gray-300 p-3">
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
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Meetup time can be discussed after seller accepts the
                      order in order details
                    </p>
                  </fieldset>

                  {/* Location / Address */}
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Fill or choose your Location / Address for this order
                    </label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={userLocation}
                      placeholder='e.g., "AU Dorm 2" or "Bangna Campus"'
                      className="w-full rounded-[5px] border border-[#dbe6ff] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#325082]/30"
                    />
                    <p className="text-xs text-gray-600 ml-3 mt-1">
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
                    <div className="my-3 border-t border-gray-300" />
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

                  <p className="text-xs text-center text-gray-600 -mt-1 leading-relaxed">
                    By confirming, you agree to TrustLoop&apos;s escrow process.
                    You&apos;ll pay on the next screen and upload a payment
                    slip. Funds are held until you confirm you&apos;ve received
                    the item.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
