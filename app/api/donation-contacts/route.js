import { auth } from "@/auth";
import {dbConnect} from "@/lib/db";
import DonationContact from "@/models/DonationContact";
import User from "@/models/User";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    await dbConnect();
    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    const url = new URL(req.url);
    const role = url.searchParams.get("role") || "donor"; // donor|requester
    const status = url.searchParams.get("status") || "";

    const q = role === "requester" ? { requesterId: me._id } : { donorId: me._id };
    if (status) q.status = status;

    const items = await DonationContact.find(q)
      .sort({ createdAt: -1 })
      .populate("itemId", "title images defaultImage category price condition")
      .populate("requesterId", "name image email")
      .lean();

    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
