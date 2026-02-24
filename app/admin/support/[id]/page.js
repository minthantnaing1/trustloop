// app/admin/support/[id]/page.js
import AdminSupportDetailsClient from "./AdminSupportDetailsClient";
import { connectDB } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import SupportTicket from "@/models/SupportTicket";

function isValidObjectId(id) {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

export default async function AdminSupportDetailsPage({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const id = p?.id;

  if (!isValidObjectId(id)) redirect("/admin/support");

  await connectDB();

  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();
  if (!me || String(me.role || "").toLowerCase() !== "admin") redirect("/home");

  const ticket = await SupportTicket.findById(id)
    .populate("user", "name email image")
    .populate("transaction")
    .populate("product", "title images price")
    .populate("buyer", "name email image")
    .populate("seller", "name email image")
    .populate("messages.by", "name email image role")
    .populate("statusUpdatedBy", "name email image role")
    .lean();

  if (!ticket) redirect("/admin/support");

  const safeTicket = JSON.parse(JSON.stringify(ticket));

  return <AdminSupportDetailsClient id={id} initialTicket={safeTicket} />;
}
