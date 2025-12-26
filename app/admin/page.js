import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import AdminCharts from "@/components/admin/AdminCharts";

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

  // --- KPIs ---
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const regularCount = users.filter((u) => u.role === "user").length;
  const otherRoleCount = totalUsers - adminCount - regularCount;

  const totalProducts = products.length;
  const availableProducts = products.filter((p) => p.isAvailable).length;
  const hiddenProducts = products.filter((p) => p.isHidden).length;

  const totalRecentTxns = recentTxns.length;
  const tByStatus = (s) => recentTxns.filter((t) => t.status === s).length;

  const paymentSuccessful = tByStatus("PAYMENT_SUCCESSFUL");
  const delivery = tByStatus("DELIVERY_IN_PROGRESS");
  const buyerConfirmed = tByStatus("BUYER_CONFIRMED");
  const paidOut = tByStatus("PAID_OUT");

  // --- Chart data: Users (role distribution) ---
  const userRoleData = [
    { name: "Admins", value: adminCount },
    { name: "Regular Users", value: regularCount },
  ];

  if (otherRoleCount > 0) {
    userRoleData.push({ name: "Other Roles", value: otherRoleCount });
  }

  // --- Chart data: Products by category ---
  const categoryCounts = {};
  products.forEach((p) => {
    const cat = p.category || "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const productsByCategory = Object.entries(categoryCounts).map(
    ([name, value]) => ({ name, value })
  );

  // --- Chart data: Products by type (sell / auction / donation / request) ---
  const typeCounts = {};
  products.forEach((p) => {
    const type = p.type || "Unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const productsByType = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // --- Chart data: Product visibility (visible vs hidden) ---
  const visibleCount = products.filter((p) => !p.isHidden).length;
  const visibilityData = [
    { name: "Visible", value: visibleCount },
    { name: "Hidden", value: hiddenProducts },
  ];

  // --- Chart data: Transactions per day (line chart) ---
  const txnCountByDate = {};
  recentTxns.forEach((t) => {
    if (!t.createdAt) return;
    const d = new Date(t.createdAt);
    // YYYY-MM-DD
    const key = d.toISOString().slice(0, 10);
    txnCountByDate[key] = (txnCountByDate[key] || 0) + 1;
  });

  const transactionsByDate = Object.entries(txnCountByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // --- Chart data: Transaction status distribution ---
  const txnStatusCounts = {};
  recentTxns.forEach((t) => {
    if (!t.status) return;
    txnStatusCounts[t.status] = (txnStatusCounts[t.status] || 0) + 1;
  });

  const transactionStatusData = Object.entries(txnStatusCounts).map(
    ([status, value]) => ({
      name: status
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      value,
    })
  );

  // --- Chart data: Most popular sold categories (from completed txns) ---
  const categorySalesCounts = {};
  const completedStatuses = ["BUYER_CONFIRMED", "PAID_OUT"];

  recentTxns.forEach((t) => {
    if (!completedStatuses.includes(t.status)) return;
    const cat = t.product?.category || "Uncategorized";
    categorySalesCounts[cat] = (categorySalesCounts[cat] || 0) + 1;
  });

  const popularCategories = Object.entries(categorySalesCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // top 6 categories

  return (
    <>
      <h1 className="text-2xl font-bold text-[#325082] mb-4">
        Admin Dashboard
      </h1>

      {/* Users – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-3xl font-bold">{adminCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Regular Users</p>
          <p className="text-3xl font-bold">{regularCount}</p>
        </div>
      </section>

      {/* Products – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-3xl font-bold">{totalProducts}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Available Products</p>
          <p className="text-3xl font-bold">{availableProducts}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Hidden Products</p>
          <p className="text-3xl font-bold">{hiddenProducts}</p>
        </div>
      </section>

      {/* Transactions – KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-5 gap-6 my-8">
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Recent Txns (last 50)</p>
          <p className="text-3xl font-bold">{totalRecentTxns}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Payment Successful</p>
          <p className="text-3xl font-bold">{paymentSuccessful}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Delivery in Progress</p>
          <p className="text-3xl font-bold">{delivery}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Buyer Confirmed</p>
          <p className="text-3xl font-bold">{buyerConfirmed}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md text-center">
          <p className="text-sm text-gray-500">Paid Out</p>
          <p className="text-3xl font-bold">{paidOut}</p>
        </div>
      </section>

      {/* Charts Dashboard */}
      <AdminCharts
        userRoleData={userRoleData}
        productsByCategory={productsByCategory}
        productsByType={productsByType}
        visibilityData={visibilityData}
        transactionsByDate={transactionsByDate}
        transactionStatusData={transactionStatusData}
        popularCategories={popularCategories}
      />
    </>
  );
}
