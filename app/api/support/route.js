// app/api/support/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";
import Transaction from "@/models/Transaction";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });

    const {
      category,
      priority = "MEDIUM",
      subject,
      description,
      images = [],
      transactionId, // ✅ from order detail
    } = body || {};

    if (!category || !subject || !description) {
      return new Response("Missing required fields", { status: 400 });
    }

    let extra = {};

    if (transactionId) {
      const txn = await Transaction.findById(transactionId)
        .select("product buyer seller")
        .lean();

      if (txn) {
        extra = {
          transaction: txn._id,
          product: txn.product,
          buyer: txn.buyer,
          seller: txn.seller,
        };
      }
    }

    const created = await SupportTicket.create({
      user: me._id,
      category,
      priority,
      subject: String(subject || "").trim(),
      description: String(description || "").trim(),
      images: Array.isArray(images) ? images : [],
      ...extra,
    });

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Support POST error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("User not found", { status: 404 });

    const tickets = await SupportTicket.find({ user: me._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("transaction product buyer seller assignedAdmin")
      .lean();

    return new Response(JSON.stringify(tickets), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Support GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
