// app/api/support/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";
import Transaction from "@/models/Transaction";

function categoryLabel(cat) {
  const map = {
    SELLER_NO_SHOW: "Seller no-show / not responding",
    BUYER_NO_SHOW: "Buyer no-show",
    DELIVERY_DELAY: "Delivery delay",
    WRONG_ITEM: "Wrong / damaged item",
    PAYMENT_ISSUE: "Payment issue",
    OTHER: "Other",
  };
  return map[cat] || "Support ticket";
}

function priorityForCategory(cat) {
  const map = {
    PAYMENT_ISSUE: "URGENT",
    WRONG_ITEM: "HIGH",
    SELLER_NO_SHOW: "HIGH",
    BUYER_NO_SHOW: "MEDIUM",
    DELIVERY_DELAY: "MEDIUM",
    OTHER: "LOW",
  };
  return map[cat] || "MEDIUM";
}

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    await connectDB();

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("User not found", { status: 404 });

    const { category, description, images = [], transactionId } = body || {};

    if (!category || !description) {
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
      priority: priorityForCategory(category),
      subject: categoryLabel(category),
      description: String(description || "").trim(),
      status: "OPEN",
      messages: [], // ✅ chat starts empty
      images: Array.isArray(images) ? images : [], // (kept if you still send it)
      ...extra,
      createdAt: new Date(),
      updatedAt: new Date(),
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

    const me = await User.findOne({ email: session.user.email }).select("_id");
    if (!me) return new Response("User not found", { status: 404 });

    const tickets = await SupportTicket.find({ user: me._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("transaction product buyer seller")
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
