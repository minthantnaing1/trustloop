import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  if (!me) return new Response("User not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const cursor = searchParams.get("cursor");
  const unreadOnly = searchParams.get("unread") === "1";

  const q = { recipient: me._id };
  if (cursor) q.updatedAt = { $lt: new Date(cursor) };
  if (unreadOnly) q.isRead = false;

  const items = await Notification.find(q)
    .sort({ updatedAt: -1 })
    .limit(limit + 1)
    .populate("actor", "name email image")
    .populate("product", "_id title")
    .populate({
      path: "transaction",
      select: "_id status buyer seller",
      populate: [
        { path: "buyer", select: "name email" },
        { path: "seller", select: "name email" },
      ],
    })
    .lean();

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  // 1) Authoritative count directly from notifications
  const unreadCount = await Notification.countDocuments({
    recipient: me._id,
    isRead: false,
  });

  // 2) Optional: reconcile the cached field on User (keeps everything consistent)
  const meDoc = await User.findById(me._id)
    .select("unreadNotifications")
    .lean();
  const cached = Number(meDoc?.unreadNotifications || 0);
  if (cached !== unreadCount) {
    await User.updateOne(
      { _id: me._id },
      { $set: { unreadNotifications: unreadCount } }
    );
  }

  return Response.json({
    items: data,
    nextCursor: hasMore ? data[data.length - 1].updatedAt : null,
    unreadCount, // ← badge should use this
  });
}

// mark-all-read
export async function PATCH(req) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  if (!me) return new Response("User not found", { status: 404 });

  await Notification.updateMany(
    { recipient: me._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { timestamps: false } // ← keep updatedAt unchanged
  );

  await User.updateOne({ _id: me._id }, { $set: { unreadNotifications: 0 } });

  return Response.json({ ok: true });
}
