import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(_req, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  if (!me) return new Response("User not found", { status: 404 });

  // Find regardless of read state (idempotent)
  const existing = await Notification.findOne({
    _id: id,
    recipient: me._id,
  }).select("_id isRead");

  if (!existing) return new Response("Not found", { status: 404 });

  // Only do work if it was unread
  if (!existing.isRead) {
    await Notification.updateOne(
      { _id: id },
      { $set: { isRead: true, readAt: new Date() } },
      { timestamps: false }
    );

    await User.updateOne(
      { _id: me._id, unreadNotifications: { $gt: 0 } },
      { $inc: { unreadNotifications: -1 } }
    );
  }

  return Response.json({ ok: true, alreadyRead: !!existing.isRead });
}
