import { auth } from "@/auth";
import dbConnect from "@/lib/db";
import DonationContact from "@/models/DonationContact";
import User from "@/models/User";

export async function PATCH(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    await dbConnect();
    const me = await User.findOne({ email: session.user.email }).lean();
    if (!me) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

    const { id } = params;
    const body = await req.json(); // { action: 'read'|'accept'|'decline'|'reply', text? }

    const contact = await DonationContact.findById(id);
    if (!contact) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    const isDonor = String(contact.donorId) === String(me._id);
    const isParticipant = isDonor || String(contact.requesterId) === String(me._id);

    if (["read", "accept", "decline"].includes(body.action) && !isDonor) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
    if (body.action === "reply" && !isParticipant) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    if (body.action === "read") contact.readByDonor = true;
    if (body.action === "accept") contact.status = "accepted";
    if (body.action === "decline") contact.status = "declined";
    if (body.action === "reply" && body.text) {
      contact.replies.push({ senderId: me._id, text: body.text });
    }

    await contact.save();
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
