import { auth } from "@/auth";
import connectDB from "@/lib/db";
import Product from "@/models/Product";              // ← use Product
import DonationContact from "@/models/DonationContact";
import User from "@/models/User";

export async function POST(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { id } = params;
    const { name, email, message } = await req.json();
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    await dbConnect();

    // fetch the donation item from Product collection
    const item = await Product.findById(id).lean();
    if (!item) return new Response(JSON.stringify({ error: "Item not found" }), { status: 404 });

    // requester is the logged-in user
    const requester = await User.findOne({ email: session.user.email });
    if (!requester) return new Response(JSON.stringify({ error: "Requester not found" }), { status: 404 });

    // donor is the product owner
    const donorId = item.owner;                      // ← your schema field
    if (!donorId) return new Response(JSON.stringify({ error: "Donor not linked" }), { status: 400 });

    const doc = await DonationContact.create({
      itemId: item._id,
      donorId,
      requesterId: requester._id,
      requesterName: name,
      requesterEmail: email,
      message
    });

    return new Response(JSON.stringify({ ok: true, contactId: doc._id }), { status: 201 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
  }
}
