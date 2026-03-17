// app/admin/transactions/[id]/page.js
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";
import Review from "@/models/Review";
import ChatThread from "@/models/ChatThread";
import BackButton from "@/components/BackButton";
import StatusPill from "@/components/StatusPill";
import Timeline from "@/components/Timeline";
import {
  UserCircleIcon,
  CubeIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "-";
  }
}

function fmtMoney(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}

function KindTag({ kind }) {
  const up = String(kind || "").toUpperCase();

  const tone =
    up === "DONATION"
      ? "bg-pink-50 text-pink-700 border-pink-200"
      : up === "AUCTION"
        ? "bg-violet-50 text-violet-700 border-violet-200"
        : "bg-sky-50 text-sky-700 border-sky-200";

  const label =
    up === "DONATION" ? "Donation" : up === "AUCTION" ? "Auction" : "Buy/Sell";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone}`}
    >
      {label}
    </span>
  );
}

function InfoRow({ label, value, mono = false, link = false }) {
  const displayValue = value || "-";

  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <div className="text-sm text-slate-500">{label}</div>

      <div
        className={`text-sm text-slate-800 break-all ${mono ? "font-mono text-[12px]" : ""}`}
      >
        {link && value && value !== "-" ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-[#325082] hover:underline"
          >
            {value}
          </a>
        ) : (
          displayValue
        )}
      </div>
    </div>
  );
}

function StarRating({ rating = 0, size = "text-lg", showNumber = true }) {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex items-center leading-none ${size}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={
              i <= Math.round(value) ? "text-amber-400" : "text-slate-300"
            }
          >
            ★
          </span>
        ))}
      </div>

      {showNumber ? (
        <span className="text-sm font-medium text-slate-500">
          {value.toFixed(1)}/5
        </span>
      ) : null}
    </div>
  );
}

function PartyCard({ title, user, extra = [] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <UserCircleIcon className="w-5 h-5 text-[#325082]" />
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            {user?.image ? (
              <img
                src={user.image}
                alt={user?.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserCircleIcon className="w-7 h-7 text-slate-400" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">
              {user?.name || "-"}
            </div>
            <div className="text-slate-500 truncate">{user?.email || "-"}</div>
          </div>
        </div>

        <div>
          <div className="text-slate-500">Phone</div>
          <div className="text-slate-800">{user?.phone || "-"}</div>
        </div>

        {extra.map((item) => (
          <div key={item.label}>
            <div className="text-slate-500">{item.label}</div>
            <div className="text-slate-800 break-words">
              {item.value || "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-800">
            {review?.reviewer?.name || review?.reviewer?.email || "-"}
          </div>
          <div className="text-xs text-slate-500">
            {String(review?.role || "").toUpperCase()} review
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-[#325082]">
            {review?.rating ? `${Number(review.rating).toFixed(1)}/5` : "-"}
          </div>
          <div className="mt-1">
            <StarRating rating={review?.rating || 0} showNumber={false} />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
        {review?.comment || "No written comment."}
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {fmtDate(review?.createdAt)}
      </div>
    </div>
  );
}

function AdminChatMessage({ msg, buyerId, sellerId, buyerName, sellerName }) {
  const senderId = String(msg?.by?._id || msg?.by || "");
  const isBuyer = senderId === String(buyerId || "");
  const isSeller = senderId === String(sellerId || "");

  const senderLabel = isBuyer
    ? buyerName || "Buyer"
    : isSeller
      ? sellerName || "Seller"
      : msg?.by?.name || msg?.by?.email || "System";

  const senderSub = isBuyer ? "Buyer" : isSeller ? "Seller" : "System";
  const isLeft = isBuyer || !isSeller;

  const bubbleTone = isBuyer
    ? "bg-slate-50 border-slate-200 text-slate-800"
    : isSeller
      ? "bg-[#f6f8fc] border-[#d9e2f0] text-slate-800"
      : "bg-amber-50 border-amber-200 text-amber-900";

  const metaTone = "text-slate-500";

  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
      <div className={`w-full max-w-[78%] ${!isLeft ? "ml-auto" : ""}`}>
        <div className={`rounded-2xl border px-3 py-2 shadow-sm ${bubbleTone}`}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold leading-4">
                {senderLabel}
              </div>
              <div className={`text-[10px] leading-4 ${metaTone}`}>
                {senderSub}
              </div>
            </div>

            <div className={`shrink-0 text-[10px] leading-4 ${metaTone}`}>
              {fmtDate(msg?.createdAt)}
            </div>
          </div>

          {!!msg?.text && (
            <div className="text-sm whitespace-pre-wrap break-words leading-5">
              {msg.text}
            </div>
          )}

          {Array.isArray(msg?.images) && msg.images.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {msg.images.map((src, idx) => (
                <a
                  key={`${src}-${idx}`}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={src}
                    alt={`chat-${idx + 1}`}
                    className="w-full h-[80px] object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AdminTransactionDetailPage({ params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/");

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();

  if (!me || me.role !== "admin") redirect("/home");

  const txn = await Transaction.findById(id)
    .populate("product")
    .populate("buyer", "name email phone faculty year location image")
    .populate("seller", "name email phone faculty year location image")
    .populate("cancelledBy", "name email")
    .lean();

  if (!txn?._id) redirect("/admin/transactions");

  const [reviews, thread] = await Promise.all([
    Review.find({ transaction: txn._id })
      .sort({ createdAt: -1 })
      .populate("reviewer", "name email")
      .populate("target", "name email")
      .lean(),

    ChatThread.findOne({ txn: txn._id })
      .populate({ path: "messages.by", select: "name email image" })
      .lean(),
  ]);

  const chatMessages = Array.isArray(thread?.messages) ? thread.messages : [];

  const kind = String(
    txn.kind || txn.product?.kind || txn.product?.type || "BUY_SELL",
  ).toUpperCase();

  const isDonation = kind === "DONATION";
  const isCancelled =
    txn.status === "CANCELLED_BY_BUYER" || txn.status === "CANCELLED_BY_SELLER";

  const payoutReady =
    !isDonation &&
    ["BUYER_CONFIRMED", "PAID_OUT", "SELLER_PROOF_UPLOADED"].includes(
      txn.status,
    );

  const refundReady = !isDonation && txn.hasPaymentSucceeded && isCancelled;

  const productImage =
    txn.product?.defaultImage || txn.product?.images?.[0] || "/placeholder.png";

  const safeTimeline = JSON.parse(JSON.stringify(txn.timeline || []));

  return (
    <main className="max-w-[1200px] mx-auto mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#325082]">
            Transaction Details
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Full admin view of this transaction, including parties, payment,
            chat, activity history, proofs, and reviews.
          </p>
        </div>
        <BackButton text="Back to Transactions" />
      </div>

      {/* Top summary */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-[96px] h-[96px] rounded-xl overflow-hidden ring-1 ring-slate-200 bg-slate-50 shrink-0">
              <img
                src={productImage}
                alt={txn.product?.title || "Product"}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[#1f2f4c]">
                  {txn.product?.title || "-"}
                </h2>
                <KindTag kind={kind} />
                <StatusPill status={txn.status} kind={kind} />
              </div>

              <div className="mt-2 text-sm text-slate-600 break-all">
                Transaction ID:{" "}
                <span className="font-mono">{txn._id.toString()}</span>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                <div>Created: {fmtDate(txn.createdAt)}</div>
                <div>Updated: {fmtDate(txn.updatedAt)}</div>
                <div>Kind: {kind}</div>
                <div>
                  Payment Succeeded: {txn.hasPaymentSucceeded ? "Yes" : "No"}
                </div>
              </div>

              {txn.cancelReason && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <div className="font-semibold flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Cancellation Reason
                  </div>
                  <div className="mt-1">{txn.cancelReason}</div>
                </div>
              )}

              {txn.adminRejectReason && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <div className="font-semibold">Admin Reject Reason</div>
                  <div className="mt-1">{txn.adminRejectReason}</div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-[360px] grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-lg font-semibold text-slate-800">
                {isDonation ? "Free" : fmtMoney(txn.total)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Platform Fee</div>
              <div className="text-lg font-semibold text-slate-800">
                {isDonation ? "-" : fmtMoney(txn.fee)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Seller Net</div>
              <div className="text-lg font-semibold text-slate-800">
                {isDonation ? "-" : fmtMoney(txn.sellerNet)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Stripe Fee</div>
              <div className="text-lg font-semibold text-slate-800">
                {txn.stripeFee ? fmtMoney(txn.stripeFee) : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-wrap justify-end gap-3">
          {payoutReady && (
            <Link
              href={`/admin/transactions/${txn._id}/payout`}
              className="inline-flex items-center rounded-lg border bg-emerald-700 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-800 px-3 py-2 text-sm font-medium text-white"
            >
              {txn.status === "PAID_OUT" ? "View Payout" : "Open Payout Page"}
            </Link>
          )}

          {refundReady && (
            <Link
              href={`/admin/transactions/${txn._id}/refund`}
              className="inline-flex items-center rounded-lg border bg-amber-700 border-amber-700 hover:bg-amber-800 hover:border-amber-800 px-3 py-2 text-sm font-medium text-white"
            >
              {txn.adminRefundReceiptUrl ? "View Refund" : "Open Refund Page"}
            </Link>
          )}
        </div>
      </section>

      {/* Parties */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <PartyCard
          title={kind === "DONATION" ? "Recipient" : "Buyer"}
          user={txn.buyer}
          extra={[
            { label: "Faculty", value: txn.buyer?.faculty || "-" },
            { label: "Year", value: txn.buyer?.year || "-" },
            {
              label: "Location",
              value: txn.buyerLocation || txn.buyer?.location || "-",
            },
          ]}
        />

        <PartyCard
          title={kind === "DONATION" ? "Donor / Seller" : "Seller"}
          user={txn.seller}
          extra={[
            { label: "Faculty", value: txn.seller?.faculty || "-" },
            { label: "Year", value: txn.seller?.year || "-" },
            { label: "Location", value: txn.seller?.location || "-" },
          ]}
        />
      </section>

      {/* Product + payment data */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CubeIcon className="w-5 h-5 text-[#325082]" />
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Product Snapshot
            </h3>
          </div>

          <InfoRow label="Title" value={txn.product?.title} />
          <InfoRow label="Category" value={txn.product?.category} />
          <InfoRow label="Condition" value={txn.product?.condition} />
          <InfoRow label="Location" value={txn.product?.location} />
          <InfoRow label="Description" value={txn.product?.description} />
          <InfoRow
            label="Price / Starting Price"
            value={
              isDonation
                ? "Free"
                : fmtMoney(
                    txn.product?.price ?? txn.product?.startingPrice ?? 0,
                  )
            }
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BanknotesIcon className="w-5 h-5 text-[#325082]" />
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Payment / Accounting
            </h3>
          </div>

          <InfoRow
            label="Transaction Total"
            value={isDonation ? "Free" : fmtMoney(txn.total)}
          />
          <InfoRow
            label="Platform Fee"
            value={isDonation ? "-" : fmtMoney(txn.fee)}
          />
          <InfoRow
            label="Seller Net"
            value={isDonation ? "-" : fmtMoney(txn.sellerNet)}
          />
          <InfoRow
            label="Stripe Fee"
            value={txn.stripeFee ? fmtMoney(txn.stripeFee) : "-"}
          />
          <InfoRow
            label="Stripe Net"
            value={txn.stripeNet ? fmtMoney(txn.stripeNet) : "-"}
          />
          <InfoRow
            label="Refund Fee"
            value={txn.refundFee ? fmtMoney(txn.refundFee) : "-"}
          />
          <InfoRow
            label="Buyer Refund Net"
            value={txn.buyerRefundNet ? fmtMoney(txn.buyerRefundNet) : "-"}
          />
          <InfoRow label="Refunded At" value={fmtDate(txn.refundedAt)} />
        </div>
      </section>

      {/* artifacts / proofs / ids */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-[#1f2f4c] mb-4">
            Payment / Stripe References
          </h3>

          <InfoRow
            label="Checkout Session ID"
            value={txn.stripeCheckoutSessionId}
            mono
          />
          <InfoRow
            label="Payment Intent ID"
            value={txn.stripePaymentIntentId}
            mono
          />
          <InfoRow
            label="Balance Transaction ID"
            value={txn.stripeBalanceTxnId}
            mono
          />
          <InfoRow label="Buyer Receipt URL" value={txn.buyerReceiptUrl} link />
          <InfoRow
            label="Admin Payout Receipt URL"
            value={txn.adminPayoutReceiptUrl}
            link
          />
          <InfoRow
            label="Admin Refund Receipt URL"
            value={txn.adminRefundReceiptUrl}
            link
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-[#1f2f4c] mb-4">
            Delivery / Proof / Control
          </h3>

          <InfoRow
            label="Seller Proof Uploaded At"
            value={fmtDate(txn.sellerProofUploadedAt)}
          />
          <InfoRow label="Auto Confirm At" value={fmtDate(txn.autoConfirmAt)} />
          <InfoRow label="Expires At" value={fmtDate(txn.expiresAt)} />
          <InfoRow
            label="Cancelled By"
            value={txn.cancelledBy?.name || txn.cancelledBy?.email || "-"}
          />
          <InfoRow label="Cancel Reason" value={txn.cancelReason} />
          <InfoRow label="Request Reason" value={txn.requestReason} />

          <div className="mt-4">
            <div className="text-sm text-slate-500 mb-2">
              Seller Proof Images
            </div>
            {Array.isArray(txn.sellerProofUrls) &&
            txn.sellerProofUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {txn.sellerProofUrls.map((url, idx) => (
                  <a
                    key={url + idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={url}
                      alt={`Proof ${idx + 1}`}
                      className="w-full h-[120px] object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                No seller proof uploaded.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* chat + timeline */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-[#325082]" />
            <div>
              <h3 className="text-lg font-semibold text-[#1f2f4c]">
                Conversation History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full buyer-seller message history for this transaction.
              </p>
            </div>
          </div>

          {chatMessages.length > 0 ? (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {chatMessages.map((msg, idx) => (
                <AdminChatMessage
                  key={msg?._id?.toString?.() || idx}
                  msg={msg}
                  buyerId={txn?.buyer?._id}
                  sellerId={txn?.seller?._id}
                  buyerName={txn?.buyer?.name}
                  sellerName={txn?.seller?.name}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-400 text-center">
              No chat messages found.
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardDocumentListIcon className="w-5 h-5 text-[#325082]" />
            <div>
              <h3 className="text-lg font-semibold text-[#1f2f4c]">
                Activity Timeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compact transaction progress in readable format.
              </p>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-1">
            <Timeline
              kind={kind}
              events={safeTimeline}
              compact
              emptyText="No timeline events found."
            />
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
        <h3 className="text-lg font-semibold text-[#1f2f4c] mb-4">
          Review Records
        </h3>

        {reviews.length === 0 ? (
          <div className="text-sm text-slate-400">
            No reviews for this transaction.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <ReviewCard key={review._id.toString()} review={review} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
