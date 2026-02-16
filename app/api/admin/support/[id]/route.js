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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email)
    return { ok: false, res: new Response("Unauthorized", { status: 401 }) };

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("_id role name email image")
    .lean();

  if (!me)
    return { ok: false, res: new Response("User not found", { status: 404 }) };

  if (String(me.role || "").toLowerCase() !== "admin") {
    return { ok: false, res: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true, me };
}

export async function GET(req, { params }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.res;

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!isValidObjectId(id))
      return new Response("Invalid ticket id", { status: 400 });

    const ticket = await SupportTicket.findById(id)
      .populate("user", "name email image")
      .populate("transaction")
      .populate("product", "title images price")
      .populate("buyer", "name email image")
      .populate("seller", "name email image")
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
    console.error("❌ Admin support [id] GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.res;
    const me = guard.me;

    const p = typeof params?.then === "function" ? await params : params;
    const id = p?.id;

    if (!isValidObjectId(id))
      return new Response("Invalid ticket id", { status: 400 });

    const body = await req.json().catch(() => ({}));

    const text = body?.text !== undefined ? String(body.text || "").trim() : "";
    const nextStatus =
      body?.status !== undefined ? String(body.status || "").toUpperCase() : "";

    const ALLOWED_STATUS = new Set([
      "OPEN",
      "IN_PROGRESS",
      "RESOLVED",
      "REJECTED",
    ]);

    // must provide either text or status
    if (!text && !nextStatus) {
      return new Response("Nothing to update", { status: 400 });
    }

    const current = await SupportTicket.findById(id)
      .select("status messages")
      .lean();

    if (!current) return new Response("Not found", { status: 404 });

    const isClosed =
      current.status === "RESOLVED" || current.status === "REJECTED";

    // If closed: allow status change only (reopen), disallow new messages
    if (isClosed && text) {
      return new Response("This ticket is closed", { status: 400 });
    }

    const update = { $set: { updatedAt: new Date() } };

    // ✅ admin sends message
    if (text) {
      update.$push = {
        messages: {
          at: new Date(),
          by: me._id,
          role: "ADMIN",
          text,
        },
      };

      // auto move OPEN -> IN_PROGRESS once admin starts replying
      if (String(current.status || "OPEN").toUpperCase() === "OPEN") {
        update.$set.status = "IN_PROGRESS";
        update.$set.statusUpdatedBy = me._id;
        update.$set.statusUpdatedAt = new Date();
      }
    }

    // ✅ admin changes status (close/open/etc.)
    if (nextStatus) {
      if (!ALLOWED_STATUS.has(nextStatus)) {
        return new Response("Invalid status", { status: 400 });
      }
      update.$set.status = nextStatus;
      update.$set.statusUpdatedBy = me._id;
      update.$set.statusUpdatedAt = new Date();
    }

    const updated = await SupportTicket.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate("user", "name email image")
      .populate("transaction")
      .populate("product", "title images price")
      .populate("buyer", "name email image")
      .populate("seller", "name email image")
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
    console.error("❌ Admin support [id] PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
