// app/my-orders/[id]/payout/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import StatusPill from "@/components/StatusPill";
import BackButton from "@/components/BackButton";
import SlipLink from "@/components/SlipLink";
import Stepper from "@/components/Stepper";
import ReviewForm from "@/components/ReviewForm";
import { PhoneIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function fmtTHB(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}
function fmtDT(dt) {
  return dt ? new Date(dt).toLocaleString() : "—";
}

export default async function SellerPayoutPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 py-6">
          <div className="rounded-[5px] bg-white p-6 border">Unauthorized</div>
        </main>
      </>
    );
  }

  // Load the transaction (SSR)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
            <BackButton />
          </div>

          {/* Progress Stepper (seller, step 4) */}
          {/* <div className="mb-5">
            <Stepper current={3} variant="seller" className="px-1" />
          </div> */}

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            Transaction not found.
          </div>
        </main>
      </>
    );
  }

  const txn = await res.json();

  // Only the seller/donor may view
  const isSeller = txn?.seller?.email === session.user.email;
  if (!isSeller) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
            <BackButton />
          </div>

          {/* Progress Stepper (seller, step 4) */}
          {/* <div className="mb-5">
            <Stepper current={3} variant="seller" className="px-1" />
          </div> */}

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            You are not the seller for this transaction.
          </div>
        </main>
      </>
    );
  }

  // Kind + guards
  const kind = (txn?.kind || txn?.type || "").toUpperCase();
  const isDonation = kind === "DONATION";
  const isAuction = kind === "AUCTION";

  // Buy & Sell guard (unchanged): allow only in final phases
  const SELL_ALLOWED = new Set([
    "SELLER_PROOF_UPLOADED",
    "BUYER_CONFIRMED",
    "PAID_OUT",
  ]);

  // Donation guard: allow only once donor marks meetup completed or recipient confirms
  const DONATION_ALLOWED = (status) =>
    ["SELLER_PROOF_UPLOADED", "BUYER_CONFIRMED"].includes(status);

  if (!isDonation && !SELL_ALLOWED.has(txn?.status)) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
            <BackButton />
          </div>
          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            Payout details are only available after the buyer confirms the order
            or when the payout is completed.
          </div>
        </main>
      </>
    );
  }

  if (isDonation && !DONATION_ALLOWED(txn?.status)) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Donation</h1>
            <BackButton />
          </div>
          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            This page is available after donor marks meetup completed or the
            recipient confirms that he received the donation.
          </div>
        </main>
      </>
    );
  }

  // Safe accessors
  const product = txn?.product || {};
  const seller = txn?.seller || {};
  const buyer = txn?.buyer || {};

  // Amounts (use backend if present; else compute a fallback)
  const fee = Number(txn?.fee || 0);
  const total = Number(txn?.total || 0);
  const sellerNet = Number(txn?.sellerNet || 0);

  const displayBaseAmount = isAuction ? total : Number(txn?.price || 0);

  // Payout artifacts from admin
  const payout = txn?.payout || {}; // { status, reference, paidAt, receiptUrl? }
  const payoutStatus =
    txn?.status === "PAID_OUT" ? "PAID" : payout?.status || "PENDING";
  const adminReceiptUrl =
    txn?.adminPayoutReceiptUrl || payout?.receiptUrl || "";

  // Fetch existing review for this role (seller vs donor)
  const roleParam = isDonation ? "donor" : "seller";
  const revRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}/review?role=${roleParam}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" },
  );
  const initialReview = revRes.ok ? await revRes.json() : null;

  // Fetch counterparty review (buyer/recipient)
  const counterRole = isDonation ? "recipient" : "buyer";
  const counterRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}/review?role=${counterRole}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" },
  );
  const counterpartyReview = counterRes.ok ? await counterRes.json() : null;

  const card = "rounded-[5px] bg-white shadow p-6";
  const title = "text-xl font-semibold text-[#1f2f4c]";
  const small = "text-sm text-gray-600";
  const priceBlock = isDonation ? (
    <p className="text-lg font-bold text-[#325082] mt-3">Free</p>
  ) : (
    <p className="text-lg font-bold text-[#325082] mt-3">
      ฿{Number(txn.total || 0).toLocaleString()}
    </p>
  );

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">
            {isDonation ? "Donation Completed" : "Payout"}
          </h1>
          <BackButton />
        </div>

        {/* Stepper */}
        {/* <div className="mb-5">
          <Stepper
            current={4}
            variant={isDonation ? "donor" : "seller"}
            className="px-1"
          />
        </div> */}

        {/* Donation (donor) view */}
        {isDonation ? (
          <>
            <div className="bg-white border border-gray-200 p-6 shadow-sm rounded-[5px] text-[#325082] mb-8">
              {/* Keep only this part centered */}
              <div className="text-center">
                <h2 className="text-lg font-semibold">
                  Thank you for your generous donation!
                </h2>
                <p className="text-sm mt-2">
                  Your contribution helps other students in need. You can leave
                  a review below.
                </p>
              </div>

              {/* Make only the cards left-aligned */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-left">
                {/* Left: Product Image */}
                <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4 flex items-center justify-center">
                  <img
                    src={
                      product?.defaultImage ||
                      product?.images?.[0] ||
                      "/placeholder.png"
                    }
                    alt={product?.title || "Donation item"}
                    className="w-[150px] h-[150px] object-cover rounded-[3px] border border-gray-300"
                  />
                </div>

                {/* Middle: Product Info */}
                <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4">
                  <p className="font-semibold text-[#325082] text-lg">
                    {product?.title || "-"}
                  </p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-[#325082]">
                        Category:
                      </span>{" "}
                      {product?.category || "-"}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-[#325082]">
                        Condition:
                      </span>{" "}
                      {product?.condition || "-"}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-[#325082]">
                        Description:
                      </span>{" "}
                      {product?.description || "-"}
                    </p>
                  </div>
                  {priceBlock}
                </div>

                {/* Right: Recipient Info */}
                <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4">
                  <p className="font-semibold text-[#325082] text-lg">
                    Recipient:
                  </p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-[#305082]">
                      {buyer?.name || buyer?.email || "-"}
                    </p>
                    <p className="text-sm text-[#1f2f4c]">
                      {buyer?.email || "-"}
                    </p>
                    {buyer?.phone && (
                      <a
                        href={`tel:${buyer.phone}`}
                        className="flex items-center gap-1 text-sm text-[#325082] hover:underline"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        {buyer.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Review (donor) */}
            <ReviewForm
              transactionId={id}
              initialReview={initialReview}
              role="donor"
            />

            {/* Counterparty's review (recipient) */}
            <div className="bg-white border border-gray-200 shadow-md rounded-[5px] p-6 mt-6">
              <h2 className="text-lg font-semibold text-[#325082] mb-3">
                Recipient&apos;s Review
              </h2>
              {counterpartyReview ? (
                <>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Rating:</span>{" "}
                    {counterpartyReview.rating}/5
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">
                    {counterpartyReview.comment || "—"}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No review yet.</p>
              )}
            </div>
          </>
        ) : (
          // Buy & Sell (seller) view — your original UI preserved
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Receipt */}
              <div className="lg:col-span-2 space-y-6">
                <div className={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={title}>Seller Payout Receipt</div>
                      <div className={small}>
                        Transaction ID:{" "}
                        <span className="font-mono">{txn?._id}</span>
                      </div>
                    </div>
                    <StatusPill status={txn?.status} />
                  </div>

                  {/* Two boxes: wider left (2fr) and narrower right (1fr) */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                    {/* LEFT: Image + Product Info (merged, wider) */}
                    <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4 flex items-center gap-4">
                      <img
                        src={
                          product?.defaultImage ||
                          product?.images?.[0] ||
                          "/placeholder.png"
                        }
                        alt={product?.title || "Product"}
                        className="w-[130px] h-[130px] object-cover rounded-[3px] border border-gray-300 flex-shrink-0"
                      />
                      <div className="text-left">
                        <p className="font-semibold text-[#325082] text-base">
                          {product?.title || "-"}
                        </p>
                        <div className="mt-1 space-y-1">
                          <p className="text-[13px] text-gray-700">
                            <span className="font-medium text-[#325082]">
                              {isAuction ? "Winning Bid:" : "Total:"}
                            </span>{" "}
                            {fmtTHB(total)}
                          </p>
                          <p className="text-[13px] text-gray-700">
                            <span className="font-medium text-[#325082]">
                              Category:
                            </span>{" "}
                            {product?.category || "-"}
                          </p>
                          <p className="text-[13px] text-gray-700">
                            <span className="font-medium text-[#325082]">
                              Condition:
                            </span>{" "}
                            {product?.condition || "-"}
                          </p>
                          <p className="text-[13px] text-gray-700">
                            <span className="font-medium text-[#325082]">
                              Description:
                            </span>{" "}
                            {product?.description || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Buyer Info (narrower) */}
                    <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4 text-left">
                      <p className="font-semibold text-[#325082] text-base">
                        Buyer:
                      </p>
                      <div className="mt-1 space-y-1">
                        <p className="text-[13px] font-semibold text-[#305082]">
                          {buyer?.name || buyer?.email || "-"}
                        </p>
                        <p className="text-[13px] text-[#1f2f4c]">
                          {buyer?.email || "-"}
                        </p>
                        {buyer?.phone && (
                          <a
                            href={`tel:${buyer.phone}`}
                            className="text-[13px] text-[#325082] hover:underline"
                          >
                            {buyer.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin slip / status */}
                <div className={card}>
                  <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
                    {payoutStatus === "PAID"
                      ? "Admin Transfer Slip"
                      : "Payout Status"}
                  </div>

                  {payoutStatus === "PAID" ? (
                    <>
                      {adminReceiptUrl ? (
                        <div className="flex flex-col items-center">
                          <div className="w-full max-w-[560px] h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                            <img
                              src={adminReceiptUrl}
                              alt="Admin payout receipt"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="mt-2">
                            <SlipLink
                              url={adminReceiptUrl}
                              title="Admin Transfer Slip"
                            >
                              Open full size
                            </SlipLink>
                          </div>
                        </div>
                      ) : (
                        <p className={small}>—</p>
                      )}
                      <div className="mt-3 text-xs text-emerald-700 font-medium">
                        Payout completed
                        {payout?.paidAt ? ` on ${fmtDT(payout.paidAt)}` : ""}.
                      </div>
                      {payout?.reference && (
                        <div className="mt-1 text-xs text-gray-600">
                          Reference:{" "}
                          <span className="font-mono">{payout.reference}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-gray-700">
                      Admin has not transferred the payout yet. You will see the
                      transfer slip here when completed.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Summary (unchanged) */}
              <div className={`${card} lg:col-span-1`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={title}>Summary</div>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold ring-1 ${
                      payoutStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }`}
                  >
                    {payoutStatus}
                  </span>
                </div>

                {/* Highlighted amount you receive */}
                <div className="rounded-[5px] bg-gradient-to-r from-[#eef4ff] to-[#f8fbff] p-4 ring-1 ring-[#e6eeff]">
                  <div className="text-xs text-[#1f3b66]/70">
                    Amount You Receive
                  </div>
                  <div className="text-3xl font-extrabold text-[#1f2f4c] mt-1">
                    {fmtTHB(sellerNet)}
                  </div>
                </div>

                {/* Breakdown */}
                <div className="mt-4 overflow-hidden rounded-[5px] ring-1 ring-[#e6eeff]">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-[#eef4ff]">
                      <tr>
                        <td className="px-4 py-2 text-gray-600">
                          {isAuction ? "Winning Bid" : "Product Price"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {fmtTHB(displayBaseAmount)}
                        </td>
                      </tr>

                      <tr>
                        <td className="px-4 py-2 text-gray-600">
                          Platform Fee (5%)
                        </td>
                        <td className="px-4 py-2 text-right text-red-600 font-medium">
                          -{fmtTHB(fee)}
                        </td>
                      </tr>

                      <tr className="bg-[#f9fbff]">
                        <td className="px-4 py-2 text-[#1f2f4c] font-semibold">
                          Total Amount
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-[#1f2f4c]">
                          {fmtTHB(sellerNet)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Review (seller) */}
            <div className="mt-6">
              <ReviewForm
                transactionId={id}
                initialReview={initialReview}
                role="seller"
              />
            </div>

            {/* Counterparty's review (buyer) */}
            <div className="bg-white border border-gray-200 shadow-md rounded-[5px] p-6 mt-6">
              <h2 className="text-lg font-semibold text-[#325082] mb-3">
                Buyer&apos;s Review
              </h2>
              {counterpartyReview ? (
                <>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Rating:</span>{" "}
                    {counterpartyReview.rating}/5
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mt-1">
                    {counterpartyReview.comment || "—"}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">No review yet.</p>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
