// app/api/notifications/[id]/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(_req, { params }) {
  const session = await auth();
  if (!session?.user?.email)
    return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  if (!me) return new Response("User not found", { status: 404 });

  const n = await Notification.findOneAndUpdate(
    { _id: params.id, recipient: me._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );

  if (!n) return new Response("Not found", { status: 404 });

  await User.updateOne(
    { _id: me._id, unreadNotifications: { $gt: 0 } },
    { $inc: { unreadNotifications: -1 } }
  );

  return Response.json({ ok: true });
}
