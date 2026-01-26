export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/auth";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await User.findOne({ email }).select("_id").lean();
    if (!me?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 },
      );
    }

    const ticket = await SupportTicket.create({
      user: me._id,
      category: body.category || "OTHER",
      priority: body.priority || "MEDIUM",
      subject,
      message,
      meta: body.meta || {},
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    console.log("SUPPORT_POST_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Admin list tickets
export async function GET(req) {
  try {
    await connectDB();

    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role from your MongoDB User model
    const me = await User.findOne({ email }).select("role").lean();
    if (me?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional: OPEN, IN_PROGRESS, RESOLVED, CLOSED
    const category = searchParams.get("category"); // optional

    const q = {};
    if (status) q.status = status;
    if (category) q.category = category;

    const tickets = await SupportTicket.find(q)
      .populate("user", "name email image")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ tickets });
  } catch (err) {
    console.log("SUPPORT_GET_ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
