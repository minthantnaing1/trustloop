import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import AdminCharts from "@/components/admin/AdminCharts";

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function fmtTHB(n) {
  return `฿${Number(n || 0).toLocaleString()}`;
}

function niceStatusLabel(status = "") {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function AdminPage() {
  const session = await auth();
  await connectDB();

  const me = await User.findOne({ email: session?.user?.email }).lean();
  if (!me || me.role !== "admin") redirect("/home");

  const [users, products, recentTxns] = await Promise.all([
    User.find().lean(),
    Product.find().populate("owner", "name email").lean(),
    Transaction.find()
      .populate("product", "title category type")
      .populate("buyer", "email name")
      .populate("seller", "email name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  // =========================
  // KPI BASE
  // =========================
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const regularCount = users.filter((u) => u.role === "user").length;
  const otherRoleCount = totalUsers - adminCount - regularCount;

  const totalProducts = products.length;
  const availableProducts = products.filter((p) => p.isAvailable).length;
  const hiddenProducts = products.filter((p) => p.isHidden).length;
  const visibleProducts = totalProducts - hiddenProducts;

  const totalRecentTxns = recentTxns.length;

  const countStatus = (status) =>
    recentTxns.filter((t) => t.status === status).length;

  const pendingPayment = countStatus("PENDING_PAYMENT");
  const paymentSuccessful = countStatus("PAYMENT_SUCCESSFUL");
  const awaitingDonor = countStatus("AWAITING_DONOR");
  const sellerAccepted = countStatus("SELLER_ACCEPTED");
  const delivery = countStatus("DELIVERY_IN_PROGRESS");
  const proofUploaded = countStatus("SELLER_PROOF_UPLOADED");
  const buyerConfirmed = countStatus("BUYER_CONFIRMED");
  const paidOut = countStatus("PAID_OUT");
  const cancelledByBuyer = countStatus("CANCELLED_BY_BUYER");
  const cancelledBySeller = countStatus("CANCELLED_BY_SELLER");

  const cancelledCount = cancelledByBuyer + cancelledBySeller;
  const completedCount = recentTxns.filter((t) =>
    ["BUYER_CONFIRMED", "PAID_OUT"].includes(t.status),
  ).length;

  const inProgressCount = recentTxns.filter((t) =>
    [
      "PENDING_PAYMENT",
      "PAYMENT_SUCCESSFUL",
      "AWAITING_DONOR",
      "SELLER_ACCEPTED",
      "DELIVERY_IN_PROGRESS",
      "SELLER_PROOF_UPLOADED",
    ].includes(t.status),
  ).length;

  const totalRecentGMV = recentTxns.reduce(
    (sum, t) => sum + Number(t.total || 0),
    0,
  );
  const totalRecentFees = recentTxns.reduce(
    (sum, t) => sum + Number(t.fee || 0),
    0,
  );
  const totalRecentSellerNet = recentTxns.reduce(
    (sum, t) => sum + Number(t.sellerNet || 0),
    0,
  );

  // =========================
  // PRODUCT ANALYSIS
  // =========================
  const typeCounts = {};
  const categoryCounts = {};

  products.forEach((p) => {
    const type = p.type || "Unknown";
    const cat = p.category || "Uncategorized";

    typeCounts[type] = (typeCounts[type] || 0) + 1;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const sellCount = typeCounts.sell || 0;
  const donationCount = typeCounts.donation || 0;
  const auctionCount = typeCounts.auction || 0;
  const requestCount = typeCounts.request || 0;

  const topCategoryEntry =
    Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // =========================
  // TRANSACTION ANALYSIS
  // =========================
  const txnStatusCounts = {};
  recentTxns.forEach((t) => {
    if (!t.status) return;
    txnStatusCounts[t.status] = (txnStatusCounts[t.status] || 0) + 1;
  });

  const mostCommonTxnStatus =
    Object.entries(txnStatusCounts).sort((a, b) => b[1] - a[1])[0] || null;

  // Transactions per day
  const txnCountByDate = {};
  recentTxns.forEach((t) => {
    if (!t.createdAt) return;
    const d = new Date(t.createdAt);
    const key = d.toISOString().slice(0, 10);
    txnCountByDate[key] = (txnCountByDate[key] || 0) + 1;
  });

  const transactionsByDate = Object.entries(txnCountByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Top sellers by completed volume
  const sellerStats = {};
  recentTxns.forEach((t) => {
    const sellerName = t?.seller?.name || t?.seller?.email || "Unknown Seller";
    if (!sellerStats[sellerName]) {
      sellerStats[sellerName] = {
        name: sellerName,
        count: 0,
        revenue: 0,
      };
    }

    if (["BUYER_CONFIRMED", "PAID_OUT"].includes(t.status)) {
      sellerStats[sellerName].count += 1;
      sellerStats[sellerName].revenue += Number(t.sellerNet || 0);
    }
  });

  const topSellers = Object.values(sellerStats)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.revenue - a.revenue;
    })
    .slice(0, 5);

  // Top buyers by order count
  const buyerStats = {};
  recentTxns.forEach((t) => {
    const buyerName = t?.buyer?.name || t?.buyer?.email || "Unknown Buyer";
    if (!buyerStats[buyerName]) {
      buyerStats[buyerName] = {
        name: buyerName,
        count: 0,
        spend: 0,
      };
    }

    buyerStats[buyerName].count += 1;
    buyerStats[buyerName].spend += Number(t.total || 0);
  });

  const topBuyers = Object.values(buyerStats)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.spend - a.spend;
    })
    .slice(0, 5);

  // Popular completed categories
  const categorySalesCounts = {};
  recentTxns.forEach((t) => {
    if (!["BUYER_CONFIRMED", "PAID_OUT"].includes(t.status)) return;
    const cat = t.product?.category || "Uncategorized";
    categorySalesCounts[cat] = (categorySalesCounts[cat] || 0) + 1;
  });

  const popularCategories = Object.entries(categorySalesCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // =========================
  // INSIGHT CARDS
  // =========================
  const insightCards = [
    {
      title: "Marketplace Health",
      value: `${pct(availableProducts, totalProducts)}%`,
      note: `${availableProducts} of ${totalProducts} posts are currently available`,
      tone: "blue",
    },
    {
      title: "Completion Rate",
      value: `${pct(completedCount, totalRecentTxns)}%`,
      note: `${completedCount} of ${totalRecentTxns} recent transactions reached final stages`,
      tone: "green",
    },
    {
      title: "Cancellation Risk",
      value: `${pct(cancelledCount, totalRecentTxns)}%`,
      note: `${cancelledCount} recent transactions were cancelled`,
      tone:
        cancelledCount >= Math.max(3, Math.ceil(totalRecentTxns * 0.2))
          ? "red"
          : "amber",
    },
    {
      title: "Hidden Posts Rate",
      value: `${pct(hiddenProducts, totalProducts)}%`,
      note: `${hiddenProducts} posts are hidden from public view`,
      tone: hiddenProducts > 0 ? "amber" : "gray",
    },
  ];

  const alertItems = [
    pendingPayment > 0
      ? `${pendingPayment} transaction(s) still waiting for payment.`
      : null,
    awaitingDonor > 0
      ? `${awaitingDonor} donation transaction(s) waiting for donor action.`
      : null,
    proofUploaded > 0
      ? `${proofUploaded} transaction(s) are waiting for buyer confirmation after seller proof upload.`
      : null,
    cancelledCount >= 5
      ? `Cancellation count is noticeably high (${cancelledCount} recent cases).`
      : null,
    hiddenProducts >= 5
      ? `${hiddenProducts} hidden product(s) may need moderation review.`
      : null,
  ].filter(Boolean);

  const businessInsights = [
    topCategoryEntry
      ? `Most listed category right now is ${topCategoryEntry[0]} with ${topCategoryEntry[1]} post(s).`
      : "No category trend available yet.",
    mostCommonTxnStatus
      ? `Most common recent transaction status is ${niceStatusLabel(
          mostCommonTxnStatus[0],
        )} (${mostCommonTxnStatus[1]} cases).`
      : "No recent transaction trend available yet.",
    sellCount || donationCount || auctionCount || requestCount
      ? `Post mix: ${sellCount} sell, ${donationCount} donation, ${auctionCount} auction, ${requestCount} request.`
      : "No product type mix available yet.",
    totalRecentTxns
      ? `Recent GMV is ${fmtTHB(totalRecentGMV)} and recent platform fees total ${fmtTHB(
          totalRecentFees,
        )}.`
      : "No recent transaction value available yet.",
  ];

  // =========================
  // CHART DATA
  // =========================
  const userRoleData = [
    { name: "Admins", value: adminCount },
    { name: "Regular Users", value: regularCount },
  ];

  if (otherRoleCount > 0) {
    userRoleData.push({ name: "Other Roles", value: otherRoleCount });
  }

  const productsByCategory = Object.entries(categoryCounts).map(
    ([name, value]) => ({ name, value }),
  );

  const productsByType = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const visibilityData = [
    { name: "Visible", value: visibleProducts },
    { name: "Hidden", value: hiddenProducts },
  ];

  const transactionStatusData = Object.entries(txnStatusCounts).map(
    ([status, value]) => ({
      name: niceStatusLabel(status),
      value,
    }),
  );

  const toneClasses = {
    blue: "from-[#eef4ff] to-white border-[#dbe7ff] text-[#1f3b66]",
    green: "from-[#eefbf4] to-white border-[#d7f3e2] text-[#166534]",
    amber: "from-[#fff8eb] to-white border-[#f6e4b8] text-[#92400e]",
    red: "from-[#fff1f2] to-white border-[#fecdd3] text-[#b42318]",
    gray: "from-[#f8fafc] to-white border-[#e5e7eb] text-[#475467]",
  };

  return (
    <div className="space-y-3 pb-6">
      <h1 className="text-2xl font-bold text-[#325082] mb-4">
        Admin Dashboard
      </h1>

      {/* Compact summary row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-500">Users</p>
          <p className="text-xl font-bold text-[#1f2f4c]">{totalUsers}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-500">Products</p>
          <p className="text-xl font-bold text-[#1f2f4c]">{totalProducts}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-500">Recent Txns</p>
          <p className="text-xl font-bold text-[#1f2f4c]">{totalRecentTxns}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3">
          <p className="text-[11px] text-gray-500">Recent GMV</p>
          <p className="text-xl font-bold text-[#1f2f4c]">
            {fmtTHB(totalRecentGMV)}
          </p>
        </div>
      </section>

      {/* Compact insight cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {insightCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border bg-gradient-to-br px-4 py-3 shadow-sm ${toneClasses[card.tone]}`}
          >
            <div className="text-xs font-medium opacity-80">{card.title}</div>
            <div className="text-2xl font-bold mt-1">{card.value}</div>
            <div className="text-xs mt-1 opacity-80 leading-relaxed line-clamp-2">
              {card.note}
            </div>
          </div>
        ))}
      </section>

      {/* Compact operational + business insights */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_.85fr] gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-base font-semibold text-[#325082] mb-3">
            Operational Snapshot
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">Pending Payment</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {pendingPayment}
              </div>
            </div>

            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">Awaiting Donor</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {awaitingDonor}
              </div>
            </div>

            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">In Progress</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {inProgressCount}
              </div>
            </div>

            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">Paid Out</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {paidOut}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-[#1f2f4c] mb-2">
              Needs Attention
            </h3>

            {alertItems.length > 0 ? (
              <div className="space-y-2">
                {alertItems.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                No urgent operational issues detected.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-base font-semibold text-[#325082] mb-3">
            Business Insights
          </h2>

          <div className="space-y-2">
            {businessInsights.slice(0, 4).map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-2 text-xs text-[#1f2f4c] leading-relaxed"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">Recent Fees</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {fmtTHB(totalRecentFees)}
              </div>
            </div>

            <div className="rounded-lg bg-[#f9fbff] border border-[#e6eeff] px-3 py-3">
              <div className="text-[11px] text-gray-500">Seller Net</div>
              <div className="text-lg font-bold text-[#1f2f4c] mt-1">
                {fmtTHB(totalRecentSellerNet)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charts directly after compact overview */}
      <AdminCharts
        userRoleData={userRoleData}
        productsByCategory={productsByCategory}
        productsByType={productsByType}
        visibilityData={visibilityData}
        transactionsByDate={transactionsByDate}
        transactionStatusData={transactionStatusData}
        popularCategories={popularCategories}
      />
    </div>
  );
}
