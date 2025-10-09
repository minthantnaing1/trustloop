// app/review/[id]/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import ReviewForm from "@/components/ReviewForm";
import Stepper from "@/components/Stepper";
import BackButton from "@/components/BackButton";
import DownloadReceiptButton from "@/components/DownloadReceiptButton";
import { PhoneIcon } from "@heroicons/react/24/outline";

export default async function ReviewPage({ params }) {
  const { id } = await params; // transactionId
  const cookieStore = await cookies();
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Review</h1>
            <BackButton />
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            You must be signed in to view this page.
          </div>
        </main>
      </>
    );
  }

  const [txnRes, revRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`, {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }),
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}/review`, {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }),
  ]);

  if (!txnRes.ok) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Review</h1>
            <BackButton />
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            Transaction not found.
          </div>
        </main>
      </>
    );
  }

  const txn = await txnRes.json();
  const initialReview = revRes.ok ? await revRes.json() : null;

  // ---- ACCESS GUARDS ----
  const isBuyerByEmail =
    session.user.email &&
    txn?.buyer?.email?.toLowerCase?.() === session.user.email.toLowerCase();

  const allowedStatuses = ["BUYER_CONFIRMED", "PAID_OUT"];
  const statusAllowed = allowedStatuses.includes(txn?.status);

  // Block unless the viewer is the buyer/recipient AND the order is complete
  if (!isBuyerByEmail || !statusAllowed) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Review</h1>
            <BackButton />
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900 space-y-2">
            <p className="font-semibold">This page isn&apos;t available.</p>
            <ul className="list-disc pl-5 text-sm">
              <li>You can only review an order as the buyer/recipient.</li>
              <li>
                The order must be completed (Buyer Confirmed or Paid Out).
              </li>
            </ul>
          </div>
        </main>
      </>
    );
  }

  // ---- Kind-aware UI bits ----
  const kind = txn?.kind || "BUY_SELL";
  const isDonation = kind === "DONATION";

  const pageTitle = isDonation ? "Donation Completed" : "Order Completed";
  const partyLabelRight = isDonation ? "Donor:" : "Seller:";
  const showReceiptButton = !isDonation; // donations have no payment

  const priceBlock = isDonation ? (
    <p className="text-lg font-bold text-[#325082] mt-3">Free</p>
  ) : (
    <p className="text-lg font-bold text-[#325082] mt-3">
      ฿{Number(txn.total || 0).toLocaleString()}
    </p>
  );

  // At this stage the order is completed; safe to show contact if present.
  const canShowContact = true;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-3 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">{pageTitle}</h1>
          <BackButton />
        </div>

        {/* Progress Stepper (recipient/buyer, final step) */}
        <div className="mb-5">
          <Stepper
            current={4}
            variant={isDonation ? "recipient" : "buyer"}
            className="px-1"
          />
        </div>

        <div className="bg-white border border-gray-200 shadow-md rounded-[5px] p-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#325082]">
              {isDonation ? "Donation Summary" : "Order Summary"}
            </h2>
            {showReceiptButton && <DownloadReceiptButton transactionId={id} />}
          </div>

          {/* Three bordered cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Left: Product Image */}
            <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4 flex items-center justify-center">
              <img
                src={
                  txn.product?.defaultImage ||
                  txn.product?.images?.[0] ||
                  "/placeholder.png"
                }
                alt={txn.product?.title}
                className="w-[150px] h-[150px] object-cover rounded-[3px] border border-gray-300"
              />
            </div>

            {/* Middle: Product Info */}
            <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4">
              <p className="font-semibold text-[#325082] text-lg">
                {txn.product?.title}
              </p>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-[#325082]">Category:</span>{" "}
                  {txn.product?.category || "-"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-[#325082]">Condition:</span>{" "}
                  {txn.product?.condition || "-"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-[#325082]">
                    Description:
                  </span>{" "}
                  {txn.product?.description || "-"}
                </p>
              </div>
              {priceBlock}
            </div>

            {/* Right: Counterparty Info (Seller/Donor) */}
            <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4">
              <p className="font-semibold text-[#325082] text-lg">
                {partyLabelRight}
              </p>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-[#305082]">
                  {txn.seller?.name || txn.seller?.email || "-"}
                </p>
                <p className="text-sm text-[#1f2f4c]">
                  {canShowContact ? txn.seller?.email || "-" : "Hidden"}
                </p>
                {canShowContact && txn.seller?.phone && (
                  <a
                    href={`tel:${txn.seller.phone}`}
                    className="flex items-center gap-1 text-sm text-[#325082] hover:underline"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    {txn.seller.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Review form */}
        <ReviewForm transactionId={id} initialReview={initialReview} />
      </main>
    </>
  );
}
