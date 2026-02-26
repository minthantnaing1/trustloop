export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import SupportTicket from "@/models/SupportTicket";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me) return new Response("User not found", { status: 404 });
    if (String(me.role || "").toLowerCase() !== "admin")
      return new Response("Forbidden", { status: 403 });

    const tickets = await SupportTicket.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("user", "name email image")
      .populate("product", "title")
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .lean();

    return new Response(JSON.stringify(Array.isArray(tickets) ? tickets : []), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Admin Support GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
