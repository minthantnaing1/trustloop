// app/api/donations/requests/route.js
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import DonationRequest from "@/models/DonationRequest";
import Product from "@/models/Product";

export async function GET(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const role = url.searchParams.get("role") || "donor"; // donor | receiver
  const status = url.searchParams.get("status"); // optional filter
  const email = session.user.email;

  const query =
    role === "receiver"
      ? { receiverEmail: email }
      : { donorEmail: email };

  if (status) query.status = status;

  await connectDB();

  const rows = await DonationRequest.find(query).sort({ createdAt: -1 }).lean();

  // join minimal donation info (title & image)
  const ids = rows.map((r) => r.donationId);
  const products = await Product.find({ _id: { $in: ids } })
    .select("title defaultImage isAvailable type price category")
    .lean();

  const map = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r,
      donation: map[r.donationId.toString()] || null,
    })),
  });
}
