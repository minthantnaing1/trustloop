"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const ROLE_COLORS = ["#325082", "#5676b1", "#7fa0d6"];
const PRODUCT_TYPE_COLORS = ["#22c55e", "#4ade80", "#86efac", "#bbf7d0"];
const CATEGORY_BAR_COLOR = "#f97316";
const VISIBILITY_COLORS = ["#16a34a", "#dc2626"];
const TXN_STATUS_COLOR = "#0ea5e9";
const POPULAR_CAT_COLOR = "#6366f1";

export default function AdminCharts({
  userRoleData,
  productsByCategory,
  productsByType,
  visibilityData,
  transactionsByDate,
  transactionStatusData,
  popularCategories,
}) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
      {/* Left column: users + products */}
      <div className="space-y-6">
        {/* User Roles Pie */}
        <div
          className="bg-white p-5 rounded-xl shadow-md flex flex-col"
          style={{ height: "330px" }}
        >
          <h2 className="font-semibold mb-2 text-[#325082]">
            User Role Distribution
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Overview of admin vs regular user accounts on TrustLoop.
          </p>
          {userRoleData && userRoleData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userRoleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="55%"
                  outerRadius={75}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {userRoleData.map((entry, index) => (
                    <Cell
                      key={`role-${entry.name}`}
                      fill={ROLE_COLORS[index % ROLE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 mt-4">
              No users yet. Data will appear here once users join TrustLoop.
            </p>
          )}
        </div>

        {/* Products by Type Pie + Visibility Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Products by Type */}
          <div
            className="bg-white p-5 rounded-xl shadow-md flex flex-col"
            style={{ height: "330px" }}
          >
            <h2 className="font-semibold mb-2 text-[#325082]">
              Products by Type
            </h2>
            <p className="text-xs text-gray-500 mb-2">
              Distribution of sell, auction, donation, and request posts.
            </p>
            {productsByType && productsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productsByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="55%"
                    outerRadius={65}
                    label={({ name, percent }) =>
                      `${capitalize(name)} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {productsByType.map((entry, index) => (
                      <Cell
                        key={`ptype-${entry.name}`}
                        fill={
                          PRODUCT_TYPE_COLORS[
                            index % PRODUCT_TYPE_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 mt-4">
                No products yet. Types will appear here once products are
                created.
              </p>
            )}
          </div>

          {/* Visibility Donut */}
          <div
            className="bg-white p-5 rounded-xl shadow-md flex flex-col"
            style={{ height: "330px" }}
          >
            <h2 className="font-semibold mb-2 text-[#325082]">
              Product Visibility
            </h2>
            <p className="text-xs text-gray-500 mb-2">
              Ratio of visible vs hidden posts.
            </p>
            {visibilityData && visibilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={visibilityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="55%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {visibilityData.map((entry, index) => (
                      <Cell
                        key={`vis-${entry.name}`}
                        fill={
                          VISIBILITY_COLORS[index % VISIBILITY_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 mt-4">
                No products yet. This will update once posts are added.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right column: categories + transactions */}
      <div className="space-y-6">
        {/* Products by Category Bar */}
        <div
          className="bg-white p-5 rounded-xl shadow-md flex flex-col"
          style={{ height: "330px" }}
        >
          <h2 className="font-semibold mb-2 text-[#325082]">
            Products by Category
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Which categories currently have the most active posts.
          </p>
          {productsByCategory && productsByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productsByCategory}
                margin={{ top: 8, right: 16, left: -10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  height={20}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill={CATEGORY_BAR_COLOR}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 mt-4">
              No products yet. Categories will appear here once posts are
              created.
            </p>
          )}
        </div>

        {/* Transactions Over Time */}
        <div
          className="bg-white p-5 rounded-xl shadow-md flex flex-col"
          style={{ height: "330px" }}
        >
          <h2 className="font-semibold mb-2 text-[#325082]">
            Transactions Over Time
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Number of transactions per day (last 50 records).
          </p>
          {transactionsByDate && transactionsByDate.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={transactionsByDate}
                margin={{ top: 8, right: 16, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  height={20}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={TXN_STATUS_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 mt-4">
              No recent transactions yet. This chart will update once students
              start buying and selling.
            </p>
          )}
        </div>
      </div>

      {/* Full width: transaction status + popular categories */}
      <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Status Bar */}
        <div
          className="bg-white p-5 rounded-xl shadow-md flex flex-col"
          style={{ height: "330px" }}
        >
          <h2 className="font-semibold mb-2 text-[#325082]">
            Transaction Status Overview
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Health of ongoing transactions (last 50).
          </p>
          {transactionStatusData && transactionStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={transactionStatusData}
                margin={{ top: 8, right: 8, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  height={20}
                  tick={{ fontSize: 10 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill={TXN_STATUS_COLOR}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 mt-4">
              No transaction data yet.
            </p>
          )}
        </div>

        {/* Most Popular Sold Categories */}
        <div
          className="bg-white p-5 rounded-xl shadow-md flex flex-col"
          style={{ height: "330px" }}
        >
          <h2 className="font-semibold mb-2 text-[#325082]">
            Most Popular Categories (Completed)
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Top categories from completed transactions (buyer confirmed / paid
            out).
          </p>
          {popularCategories && popularCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={popularCategories}
                layout="vertical"
                margin={{ top: 8, right: 16, left: -40, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill={POPULAR_CAT_COLOR}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 mt-4">
              No completed transactions yet. Once students finish deals, top
              categories will show here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
