// app/admin/support/page.js
import AdminSupportClient from "./AdminSupportClient";
import { connectDB } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";

// ✅ important on Vercel: register referenced models in this bundle
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export default async function AdminSupportPage() {
  await connectDB();
  const session = await auth();

  if (!session?.user?.email) redirect("/");

  // ✅ Admin gate (same style as transactions page)
  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();
  if (!me || String(me.role || "").toLowerCase() !== "admin") redirect("/home");

  // ✅ Load initial tickets for first paint
  const tickets = await SupportTicket.find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate("user", "name email image")
    .populate("product", "title")
    .populate("buyer", "name email image")
    .populate("seller", "name email image")
    .lean();

  const safeInitialTickets = JSON.parse(JSON.stringify(tickets || []));

  return <AdminSupportClient initialTickets={safeInitialTickets} />;
}
