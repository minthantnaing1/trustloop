// app/api/admin/support/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });
    if (me.role !== "admin") return new Response("Forbidden", { status: 403 });

    const tickets = await SupportTicket.find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("user transaction product buyer seller assignedAdmin")
      .lean();

    return new Response(JSON.stringify(tickets), {
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
