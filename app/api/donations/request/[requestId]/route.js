// app/api/donations/requests/[requestId]/route.js
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import DonationRequest from "@/models/DonationRequest";

export async function PATCH(req, { params }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = params;
  const { action } = await req.json();

  await connectDB();

  const doc = await DonationRequest.findById(requestId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = session.user.email.toLowerCase();
  const isDonor = email === (doc.donorEmail || "").toLowerCase();
  const isReceiver = email === (doc.receiverEmail || "").toLowerCase();

  const transitions = {
    ACCEPT:  { from: ["REQUESTED"], to: "ACCEPTED",  role: "donor" },
    DECLINE: { from: ["REQUESTED"], to: "DECLINED", role: "donor" },
    COMPLETE:{ from: ["ACCEPTED"],  to: "COMPLETED", role: "donor" },
    CANCEL:  { from: ["REQUESTED","ACCEPTED"], to: "CANCELLED", role: "receiver" },
  };

  const rule = transitions[action];
  if (!rule) return NextResponse.json({ error: "Bad action" }, { status: 400 });
  if (!rule.from.includes(doc.status)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 409 });
  }
  if ((rule.role === "donor" && !isDonor) || (rule.role === "receiver" && !isReceiver)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  doc.status = rule.to;
  await doc.save();

  return NextResponse.json({ ok: true, status: doc.status });
}
