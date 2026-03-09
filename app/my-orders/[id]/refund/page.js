import { cookies } from "next/headers";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import SlipLink from "@/components/SlipLink";
import StatusPill from "@/components/StatusPill";
import { PhoneIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

function fmtTHB(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}

function fmtDT(dt) {
  return dt ? new Date(dt).toLocaleString() : "—";
}

function calcFee(total) {
  return Math.round(Number(total || 0) * 0.05);
}

export default async function BuyerRefundPage({ params }) {
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
            <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
            <BackButton />
          </div>

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            Transaction not found.
          </div>
        </main>
      </>
    );
  }

  const txn = await res.json();

  const isBuyer = txn?.buyer?.email === session.user.email;
  if (!isBuyer) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
            <BackButton />
          </div>

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            You are not the buyer for this transaction.
          </div>
        </main>
      </>
    );
  }

  const kind = String(txn?.kind || txn?.type || "").toUpperCase();
  const isDonation = kind === "DONATION";

  if (isDonation) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
            <BackButton />
          </div>

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            Refund page is not available for donation transactions.
          </div>
        </main>
      </>
    );
  }

  const isCancelled =
    txn?.status === "CANCELLED_BY_BUYER" ||
    txn?.status === "CANCELLED_BY_SELLER";

  const hasPaymentSucceeded = Boolean(txn?.hasPaymentSucceeded);
  const refundSlipUrl = txn?.adminRefundReceiptUrl || "";
  const refundProcessed = Boolean(refundSlipUrl);

  if (!isCancelled || !hasPaymentSucceeded) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
            <BackButton />
          </div>

          <div className="rounded-[5px] bg-white p-6 border border-[#325082] text-[#325082] text-center">
            Refund details are only available for paid cancelled transactions.
          </div>
        </main>
      </>
    );
  }

  const product = txn?.product || {};
  const seller = txn?.seller || {};
  const buyer = txn?.buyer || {};

  const total = Number(txn?.total || 0);
  const fee = Number(txn?.refundFee ?? calcFee(total));
  const buyerNet = Number(txn?.buyerRefundNet ?? Math.max(0, total - fee));

  const card = "rounded-[5px] bg-white shadow p-6";
  const title = "text-xl font-semibold text-[#1f2f4c]";
  const small = "text-sm text-gray-600";

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
          <BackButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={title}>Buyer Refund Receipt</div>
                  <div className={small}>
                    Transaction ID:{" "}
                    <span className="font-mono">{txn?._id}</span>
                  </div>
                </div>
                <StatusPill status={txn?.status} />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                {/* LEFT: product */}
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
                          Paid Amount:
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

                {/* RIGHT: seller */}
                <div className="rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4 text-left">
                  <p className="font-semibold text-[#325082] text-base">
                    Seller:
                  </p>
                  <div className="mt-1 space-y-1">
                    <p className="text-[13px] font-semibold text-[#305082]">
                      {seller?.name || seller?.email || "-"}
                    </p>
                    <p className="text-[13px] text-[#1f2f4c]">
                      {seller?.email || "-"}
                    </p>
                    {seller?.phone && (
                      <a
                        href={`tel:${seller.phone}`}
                        className="flex items-center gap-1 text-[13px] text-[#325082] hover:underline"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        {seller.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="text-sm font-semibold text-[#1f2f4c] mb-3">
                {refundProcessed ? "Admin Refund Slip" : "Refund Status"}
              </div>

              {refundProcessed ? (
                <>
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-[560px] h-[200px] sm:h-[380px] overflow-hidden ring-1 ring-[#e6eeff] flex items-center justify-center">
                      <img
                        src={refundSlipUrl}
                        alt="Admin refund receipt"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="mt-2">
                      <SlipLink url={refundSlipUrl} title="Admin Refund Slip">
                        Open full size
                      </SlipLink>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-emerald-700 font-medium">
                    Refund completed
                    {txn?.refundedAt ? ` on ${fmtDT(txn.refundedAt)}` : ""}.
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-700">
                  Admin has not uploaded the refund slip yet. You will see the
                  refund receipt here when the refund is completed.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className={`${card} lg:col-span-1`}>
            <div className="flex items-center justify-between mb-3">
              <div className={title}>Summary</div>
              <span
                className={`px-2 py-1 rounded-md text-xs font-semibold ring-1 ${
                  refundProcessed
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200"
                }`}
              >
                {refundProcessed ? "REFUNDED" : "PENDING"}
              </span>
            </div>

            <div className="rounded-[5px] bg-gradient-to-r from-[#eef4ff] to-[#f8fbff] p-4 ring-1 ring-[#e6eeff]">
              <div className="text-xs text-[#1f3b66]/70">
                Amount You Receive
              </div>
              <div className="text-3xl font-extrabold text-[#1f2f4c] mt-1">
                {fmtTHB(buyerNet)}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[5px] ring-1 ring-[#e6eeff]">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#eef4ff]">
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Paid Amount</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmtTHB(total)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-2 text-gray-600">Fee (5%)</td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      -{fmtTHB(fee)}
                    </td>
                  </tr>

                  <tr className="bg-[#f9fbff]">
                    <td className="px-4 py-2 text-[#1f2f4c] font-semibold">
                      Total Refund
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-[#1f2f4c]">
                      {fmtTHB(buyerNet)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-[5px] border border-gray-200 bg-[#f9fbff] p-4">
              <div className="text-sm text-gray-500">Buyer</div>
              <div className="font-semibold text-[#1f2f4c]">
                {buyer?.name || buyer?.email || "-"}
              </div>
              <div className="text-sm text-gray-600">{buyer?.email}</div>
              {buyer?.phone && (
                <a
                  href={`tel:${buyer.phone}`}
                  className="flex items-center gap-1 text-sm text-[#325082] hover:underline mt-1"
                >
                  <PhoneIcon className="w-4 h-4" />
                  {buyer.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
