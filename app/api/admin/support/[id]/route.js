// app/api/admin/support/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";

export async function PATCH(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });
    if (me.role !== "admin") return new Response("Forbidden", { status: 403 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    const { status, priority, assignedAdmin, adminNote } = body || {};

    const update = {
      updatedAt: new Date(), // ✅ important (pre-save won't run on findByIdAndUpdate)
    };

    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (adminNote !== undefined) update.adminNote = adminNote;

    // allow null to unassign
    if (assignedAdmin !== undefined)
      update.assignedAdmin = assignedAdmin || null;

    const updated = await SupportTicket.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate("user transaction product buyer seller assignedAdmin")
      .lean();

    if (!updated) return new Response("Not found", { status: 404 });

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Admin Support PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
