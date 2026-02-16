export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";

function isValidObjectId(id) {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("User not found", { status: 404 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!isValidObjectId(id)) {
      return new Response("Invalid ticket id", { status: 400 });
    }

    const ticket = await SupportTicket.findOne({ _id: id, user: me._id })
      .populate("transaction product buyer seller")
      .populate("messages.by", "name email image role")
      .populate("statusUpdatedBy", "name email image role")
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

export async function PATCH(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("User not found", { status: 404 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!isValidObjectId(id)) {
      return new Response("Invalid ticket id", { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    if (!text) return new Response("Message is required", { status: 400 });

    // load ticket (must belong to user)
    const ticket = await SupportTicket.findOne({ _id: id, user: me._id })
      .select("status messages")
      .lean();

    if (!ticket) return new Response("Not found", { status: 404 });

    const s = String(ticket.status || "OPEN").toUpperCase();
    if (s === "RESOLVED" || s === "REJECTED") {
      return new Response("This ticket is closed", { status: 400 });
    }

    // ✅ RULE: user cannot send the first message (admin must reply first)
    const hasAdminMessage = Array.isArray(ticket.messages)
      ? ticket.messages.some((m) => String(m?.role || "") === "ADMIN")
      : false;

    if (!hasAdminMessage) {
      return new Response("Please wait for an admin reply before messaging.", {
        status: 400,
      });
    }

    const msg = {
      at: new Date(),
      by: me._id,
      role: "USER",
      text,
    };

    const update = {
      $push: { messages: msg },
      $set: { updatedAt: new Date() },
    };

    // if already IN_PROGRESS, keep; if OPEN (shouldn't happen after admin replied, but safe)
    if (s === "OPEN") update.$set.status = "IN_PROGRESS";

    const updated = await SupportTicket.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate("transaction product buyer seller")
      .populate("messages.by", "name email image role")
      .populate("statusUpdatedBy", "name email image role")
      .lean();

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Support [id] PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("User not found", { status: 404 });

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!isValidObjectId(id)) {
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
