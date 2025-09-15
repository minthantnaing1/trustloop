// app/my-orders/[id]/payout/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import StatusPill from "@/components/StatusPill";
import BackButton from "@/components/BackButton";
import SlipLink from "@/components/SlipLink";

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
          <div className="rounded-xl bg-white p-6 border">Unauthorized</div>
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
    }
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
          <div className="rounded-xl bg-white p-6 border">
            Transaction not found.
          </div>
        </main>
      </>
    );
  }

  const txn = await res.json();

  // Only the seller may view
  const isSeller = txn?.seller?.email === session.user.email;
  if (!isSeller) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
            <BackButton />
          </div>
          <div className="rounded-xl bg-white p-6 border">
            You are not the seller for this transaction.
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
  const price = Number(txn?.price || 0);
  const fee = Number(txn?.fee || 0);
  const total = Number(txn?.total || 0);
  const sellerNet = Number(txn?.sellerNet || 0);

  // Payout artifacts from admin
  const payout = txn?.payout || {}; // { status, reference, paidAt, receiptUrl? }
  const payoutStatus =
    txn?.status === "PAID_OUT" ? "PAID" : payout?.status || "PENDING";
  const adminReceiptUrl =
    txn?.adminPayoutReceiptUrl || payout?.receiptUrl || "";

  const card = "rounded-xl bg-white shadow p-6";
  const subCard = "rounded-xl bg-[#f9fbff] p-4 shadow-sm";
  const title = "text-xl font-semibold text-[#1f2d4d]";
  const small = "text-sm text-gray-600";

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
          <BackButton />
        </div>

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

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={subCard}>
                  <div className="text-sm text-gray-500">Product</div>
                  <div className="font-semibold text-[#1f2f4c]">
                    {product?.title || "-"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Total: {fmtTHB(total)}
                  </div>
                </div>

                <div className={subCard}>
                  <div className="text-sm text-gray-500">Parties</div>
                  <div className="text-[13px] text-gray-600">
                    <div>
                      <b>Buyer:</b> {buyer?.name || buyer?.email || "-"}
                    </div>
                    <div className="truncate">{buyer?.email}</div>
                    <div className="mt-2">
                      <b>Seller (you):</b>{" "}
                      {seller?.name || seller?.email || "-"}
                    </div>
                    <div className="truncate">{seller?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin slip / status */}
            <div className={card}>
              <div className="text-sm font-semibold text-[#1f2f4c] mb-2">
                {payoutStatus === "PAID"
                  ? "Admin Transfer Slip"
                  : "Payout Status"}
              </div>

              {payoutStatus === "PAID" ? (
                <>
                  {adminReceiptUrl ? (
                    <div className="flex flex-col items-center">
                      <div className="rounded-2xl mb-2 overflow-hidden shadow-sm ring-1 ring-[#e6eeff]">
                        <img
                          src={adminReceiptUrl}
                          alt="Admin payout receipt"
                          className="w-[360px] h-[480px] object-contain bg-white"
                        />
                      </div>
                      <SlipLink
                        url={adminReceiptUrl}
                        title="Admin Transfer Slip"
                      >
                        Open full size
                      </SlipLink>
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

          {/* RIGHT: Summary */}
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
            <div className="rounded-xl bg-gradient-to-r from-[#eef4ff] to-[#f8fbff] p-4 ring-1 ring-[#e6eeff]">
              <div className="text-xs text-[#1f3b66]/70">
                Amount You Receive
              </div>
              <div className="text-3xl font-extrabold text-[#1f2f4c] mt-1">
                {fmtTHB(sellerNet)}
              </div>
            </div>

            {/* Breakdown */}
            <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-[#e6eeff]">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#eef4ff]">
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Product Price</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmtTHB(price)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-gray-600">Fee</td>
                    <td className="px-4 py-2 text-right">{fmtTHB(fee)}</td>
                  </tr>
                  <tr className="bg-[#f9fbff]">
                    <td className="px-4 py-2 text-[#1f2f4c] font-semibold">
                      Total Paid (Buyer)
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-[#1f2f4c]">
                      {fmtTHB(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
