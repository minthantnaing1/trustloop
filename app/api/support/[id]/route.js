export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return new Response("Invalid ticket id", { status: 400 });
    }

    const ticket = await SupportTicket.findOne({ _id: id, user: me._id })
      .populate("transaction product buyer seller assignedAdmin")
      .lean();

    if (!ticket) return new Response("Not found", { status: 404 });

    return new Response(JSON.stringify(ticket), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Support [id] GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return new Response("Invalid ticket id", { status: 400 });
    }

    const deleted = await SupportTicket.findOneAndDelete({
      _id: id,
      user: me._id,
    });

    if (!deleted) return new Response("Not found", { status: 404 });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Support [id] DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
