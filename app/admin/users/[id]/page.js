// app/admin/users/[id]/page.js
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Review from "@/models/Review";
import SupportTicket from "@/models/SupportTicket";
import BackButton from "@/components/BackButton";
import ActionButton from "@/components/ActionButton";
import MaskedUserId from "@/components/MaskedUserId";
import AdminUserReviewsSection from "@/components/admin/AdminUserReviewsSection";

function StatCard({ label, value, sub = "" }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-[#325082]">{value}</div>
      {sub ? <div className="text-xs text-gray-400 mt-1">{sub}</div> : null}
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

function StatusTag({ status }) {
  const s = String(status || "active").toLowerCase();
  const tone =
    s === "banned"
      ? "ring-red-200/70 bg-red-50/70 text-red-700"
      : "ring-emerald-200/70 bg-emerald-50/70 text-emerald-700";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
    >
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
}

function TxnStatusPill({ status }) {
  const s = String(status || "").toUpperCase();

  const tone =
    s === "PAID_OUT"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "BUYER_CONFIRMED"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : s === "CANCELLED_BY_BUYER" || s === "CANCELLED_BY_SELLER"
          ? "bg-red-50 text-red-700 border-red-200"
          : s === "PENDING_PAYMENT"
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone}`}
    >
      {s || "-"}
    </span>
  );
}

function TicketStatusPill({ status }) {
  const s = String(status || "OPEN").toUpperCase();

  const tone =
    s === "RESOLVED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "IN_PROGRESS"
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : s === "REJECTED"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${tone}`}
    >
      {s.replaceAll("_", " ")}
    </span>
  );
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

function getReceivedReviewLabel(role, txnKind) {
  const kind = String(txnKind || "").toUpperCase();

  if (role === "buyer") {
    return kind === "DONATION"
      ? "Recipient reviewed this user"
      : "Buyer reviewed this user";
  }

  return kind === "DONATION"
    ? "Donor reviewed this user"
    : "Seller reviewed this user";
}

function getWrittenReviewLabel(role, txnKind) {
  const kind = String(txnKind || "").toUpperCase();

  if (role === "buyer") {
    return kind === "DONATION"
      ? "This user reviewed donor"
      : "This user reviewed seller";
  }

  return kind === "DONATION"
    ? "This user reviewed recipient"
    : "This user reviewed buyer";
}

export default async function AdminUserDetailPage({ params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email) redirect("/");

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();

  if (!me || me.role !== "admin") redirect("/home");

  const user = await User.findById(id).lean();
  if (!user?._id) redirect("/admin/users");

  const [
    activeProducts,
    allProducts,
    buyerTxns,
    sellerTxns,
    supportTickets,
    completedSoldCount,
    completedBoughtCount,
    receivedReviewsRaw,
    writtenReviewsRaw,
  ] = await Promise.all([
    Product.find({ owner: user._id, isAvailable: true })
      .sort({ createdAt: -1 })
      .select(
        "title type category price startingPrice donationMode isAvailable isHidden createdAt",
      )
      .lean(),

    Product.find({ owner: user._id })
      .sort({ createdAt: -1 })
      .select(
        "title type category price startingPrice donationMode isAvailable isHidden createdAt",
      )
      .lean(),

    Transaction.find({ buyer: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("product", "title type")
      .populate("seller", "name email")
      .lean(),

    Transaction.find({ seller: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("product", "title type")
      .populate("buyer", "name email")
      .lean(),

    SupportTicket.find({
      $or: [{ user: user._id }, { buyer: user._id }, { seller: user._id }],
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("product", "title")
      .lean(),

    Transaction.countDocuments({
      seller: user._id,
      status: "PAID_OUT",
      kind: { $in: ["BUY_SELL", "AUCTION"] },
    }),

    Transaction.countDocuments({
      buyer: user._id,
      status: { $in: ["BUYER_CONFIRMED", "PAID_OUT"] },
      kind: { $in: ["BUY_SELL", "AUCTION"] },
    }),

    Review.find({ target: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "product",
        select: "title images defaultImage category type kind",
        lean: true,
      })
      .populate({
        path: "reviewer",
        select: "name email",
        lean: true,
      })
      .populate({
        path: "transaction",
        select: "kind",
        lean: true,
      })
      .lean(),

    Review.find({ reviewer: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate({
        path: "product",
        select: "title images defaultImage category type kind",
        lean: true,
      })
      .populate({
        path: "target",
        select: "name email",
        lean: true,
      })
      .populate({
        path: "transaction",
        select: "kind",
        lean: true,
      })
      .lean(),
  ]);

  const receivedReviews = (receivedReviewsRaw || [])
    .map((r) => {
      const p = r.product;
      const t = r.transaction;
      if (!p?._id || !t?._id) return null;

      return {
        transactionId: t._id.toString(),
        title: p.title || "Untitled",
        image: p.defaultImage || p.images?.[0] || "/placeholder.png",
        category: p.category || "",
        rating: Number(r.rating || 0),
        comment: r.comment || "",
        createdAt: r.createdAt || null,
        reviewTypeLabel: getReceivedReviewLabel(
          r.role,
          t.kind || p.kind || p.type,
        ),
        personLabel: r.reviewer?.name || r.reviewer?.email || "Counterparty",
      };
    })
    .filter((r) => r && r.rating > 0);

  const writtenReviews = (writtenReviewsRaw || [])
    .map((r) => {
      const p = r.product;
      const t = r.transaction;
      if (!p?._id || !t?._id) return null;

      return {
        transactionId: t._id.toString(),
        title: p.title || "Untitled",
        image: p.defaultImage || p.images?.[0] || "/placeholder.png",
        category: p.category || "",
        rating: Number(r.rating || 0),
        comment: r.comment || "",
        createdAt: r.createdAt || null,
        reviewTypeLabel: getWrittenReviewLabel(
          r.role,
          t.kind || p.kind || p.type,
        ),
        personLabel: r.target?.name || r.target?.email || "Counterparty",
      };
    })
    .filter((r) => r && r.rating > 0);

  const totalListings = allProducts.length;
  const activeListings = activeProducts.length;
  const totalBuyerTxns = buyerTxns.length;
  const totalSellerTxns = sellerTxns.length;
  const openTickets = supportTickets.filter(
    (t) => String(t.status || "").toUpperCase() === "OPEN",
  ).length;

  const profileImg = user?.image || "/default-profile.jpg";

  return (
    <>
      <main className="max-w-[1200px] mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">User Details</h1>
          <BackButton text="Back to Users" />
        </div>

        {/* Top summary */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden ring-1 ring-slate-200 bg-slate-50 shrink-0">
                <img
                  src={profileImg}
                  alt={user.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#1f2f4c]">
                    {user.name || "-"}
                  </h2>
                  <StatusTag status={user.status || "active"} />
                  <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {user.role || "user"}
                  </span>
                </div>

                <div className="mt-1 text-sm text-slate-700 break-all">
                  {user.email || "-"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  AU ID: <MaskedUserId email={user.email} reveal />
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <div>Phone: {user.phone || "Not set"}</div>
                  <div>Faculty: {user.faculty || "Not set"}</div>
                  <div>Year: {user.year || "Not set"}</div>
                  <div>Location: {user.location || "Not set"}</div>
                  <div>Joined: {fmtDate(user.createdAt)}</div>
                  <div>Updated: {fmtDate(user.updatedAt)}</div>
                </div>

                {user.status === "banned" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="font-semibold">Ban Information</div>
                    <div className="mt-1">
                      Type: {user.banType || "PERMANENT"}
                    </div>
                    <div>
                      Until:{" "}
                      {user.bannedUntil
                        ? fmtDate(user.bannedUntil)
                        : "Until admin releases"}
                    </div>
                    <div>
                      Reason: {user.bannedReason || "No reason provided"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:ml-auto grid grid-cols-2 md:grid-cols-3 gap-3 w-full lg:w-[520px]">
              <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
                <div className="text-sm text-gray-500">Rating</div>
                <div className="text-2xl font-bold text-[#325082]">
                  {Number(user.rating || 0).toFixed(1)}
                </div>
                <div className="mt-1">
                  <StarRating rating={user.rating || 0} />
                </div>
              </div>
              <StatCard label="Items Sold" value={completedSoldCount} />
              <StatCard label="Items Bought" value={completedBoughtCount} />
              <StatCard label="Revenue" value={fmtMoney(user.revenue || 0)} />
              <StatCard label="Spending" value={fmtMoney(user.expenses || 0)} />
              <StatCard label="Open Tickets" value={openTickets} />
            </div>
          </div>
        </section>

        {/* Account / payment */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
          <h3 className="text-lg font-semibold text-[#1f2f4c] mb-4">
            Account / Payment Background
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-500">Badge</div>
              <div className="font-medium text-[#1f2f4c]">
                {(user.badges && user.badges[0]) || "None"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-500">Posting Credits</div>
              <div className="font-medium text-[#1f2f4c]">
                {user.postingCredits ?? 0}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-500">Bank Account Name</div>
              <div className="font-medium text-[#1f2f4c]">
                {user.bankAccountName || "Not set"}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-slate-500">Bank Account Number</div>
              <div className="font-medium text-[#1f2f4c]">
                {user.bankAccountNumber || "Not set"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-slate-500 mb-2">Default QR Scan</div>
            {user.defaultScanCode ? (
              <div className="w-[160px] h-[160px] border border-slate-200 rounded-lg overflow-hidden bg-white">
                <img
                  src={user.defaultScanCode}
                  alt="Default QR"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="text-sm text-slate-400">No QR uploaded</div>
            )}
          </div>
        </section>

        {/* listings */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Product Listing Background
            </h3>
            <div className="text-sm text-slate-500">
              Total: <b>{totalListings}</b> • Active: <b>{activeListings}</b>
            </div>
          </div>

          {allProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No listings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border-b font-medium">Title</th>
                    <th className="p-2 border-b font-medium">Type</th>
                    <th className="p-2 border-b font-medium">Category</th>
                    <th className="p-2 border-b font-medium">Price</th>
                    <th className="p-2 border-b font-medium">Availability</th>
                    <th className="p-2 border-b font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((p) => (
                    <tr key={p._id.toString()} className="hover:bg-slate-50">
                      <td className="p-2">{p.title || "-"}</td>
                      <td className="p-2">
                        <KindTag kind={p.type || "BUY_SELL"} />
                      </td>
                      <td className="p-2">{p.category || "-"}</td>
                      <td className="p-2">
                        {String(p.type || "").toLowerCase() === "donation"
                          ? "Free"
                          : fmtMoney(p.price ?? p.startingPrice ?? 0)}
                      </td>
                      <td className="p-2">
                        {p.isAvailable ? (
                          <span className="text-emerald-700 font-medium">
                            Available
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">
                            Unavailable
                          </span>
                        )}
                        {p.isHidden ? (
                          <span className="ml-2 text-red-600 text-xs">
                            (Hidden)
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2">{fmtDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* buyer history */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Purchase History (Buyer Side)
            </h3>
            <div className="text-sm text-slate-500">
              Recent: <b>{totalBuyerTxns}</b>
            </div>
          </div>

          {buyerTxns.length === 0 ? (
            <p className="text-sm text-slate-500">
              No buyer transactions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border-b font-medium">Product</th>
                    <th className="p-2 border-b font-medium">Type</th>
                    <th className="p-2 border-b font-medium">Seller</th>
                    <th className="p-2 border-b font-medium">Total</th>
                    <th className="p-2 border-b font-medium">Status</th>
                    <th className="p-2 border-b font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {buyerTxns.map((t) => (
                    <tr key={t._id.toString()} className="hover:bg-slate-50">
                      <td className="p-2">{t.product?.title || "-"}</td>
                      <td className="p-2">
                        <KindTag
                          kind={t.kind || t.product?.type || "BUY_SELL"}
                        />
                      </td>
                      <td className="p-2">
                        {t.seller?.name || t.seller?.email || "-"}
                      </td>
                      <td className="p-2">
                        {String(t.kind || "").toUpperCase() === "DONATION"
                          ? "Free"
                          : fmtMoney(t.total || 0)}
                      </td>
                      <td className="p-2">
                        <TxnStatusPill status={t.status} />
                      </td>
                      <td className="p-2">
                        {fmtDate(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* seller history */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Sales History (Seller Side)
            </h3>
            <div className="text-sm text-slate-500">
              Recent: <b>{totalSellerTxns}</b>
            </div>
          </div>

          {sellerTxns.length === 0 ? (
            <p className="text-sm text-slate-500">
              No seller transactions found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border-b font-medium">Product</th>
                    <th className="p-2 border-b font-medium">Type</th>
                    <th className="p-2 border-b font-medium">Buyer</th>
                    <th className="p-2 border-b font-medium">Total</th>
                    <th className="p-2 border-b font-medium">Status</th>
                    <th className="p-2 border-b font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerTxns.map((t) => (
                    <tr key={t._id.toString()} className="hover:bg-slate-50">
                      <td className="p-2">{t.product?.title || "-"}</td>
                      <td className="p-2">
                        <KindTag
                          kind={t.kind || t.product?.type || "BUY_SELL"}
                        />
                      </td>
                      <td className="p-2">
                        {t.buyer?.name || t.buyer?.email || "-"}
                      </td>
                      <td className="p-2">
                        {String(t.kind || "").toUpperCase() === "DONATION"
                          ? "Free"
                          : fmtMoney(t.total || 0)}
                      </td>
                      <td className="p-2">
                        <TxnStatusPill status={t.status} />
                      </td>
                      <td className="p-2">
                        {fmtDate(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AdminUserReviewsSection
          receivedReviews={receivedReviews}
          writtenReviews={writtenReviews}
        />

        {/* support tickets */}
        <section className="bg-white rounded-xl shadow-md border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1f2f4c]">
              Support Ticket Background
            </h3>
            <div className="text-sm text-slate-500">
              Total: <b>{supportTickets.length}</b>
            </div>
          </div>

          {supportTickets.length === 0 ? (
            <p className="text-sm text-slate-500">No support tickets found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-2 border-b font-medium">Subject</th>
                    <th className="p-2 border-b font-medium">Category</th>
                    <th className="p-2 border-b font-medium">Product</th>
                    <th className="p-2 border-b font-medium">Priority</th>
                    <th className="p-2 border-b font-medium">Status</th>
                    <th className="p-2 border-b font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.map((t) => (
                    <tr key={t._id.toString()} className="hover:bg-slate-50">
                      <td className="p-2">{t.subject || "Support Ticket"}</td>
                      <td className="p-2">
                        {String(t.category || "OTHER").replaceAll("_", " ")}
                      </td>
                      <td className="p-2">{t.product?.title || "-"}</td>
                      <td className="p-2">{t.priority || "-"}</td>
                      <td className="p-2">
                        <TicketStatusPill status={t.status} />
                      </td>
                      <td className="p-2">
                        {fmtDate(t.updatedAt || t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
