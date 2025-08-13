import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const session = await auth();
  if (!session?.user?.email)
    return new NextResponse("Unauthorized", { status: 401 });

  await connectDB();
  const me = await User.findOne({ email: session.user.email }).lean();
  if (!me || me.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  const txn = await Transaction.findById(params.id).lean();
  if (!txn?.buyerPaymentReceiptB64)
    return new NextResponse("Not Found", { status: 404 });

  let base64 = txn.buyerPaymentReceiptB64;
  let contentType = "image/png";
  const m = /^data:(.+);base64,(.*)$/.exec(base64);
  if (m) {
    contentType = m[1] || contentType;
    base64 = m[2] || "";
  }
  try {
    const buf = Buffer.from(base64, "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=0, no-store",
        "Content-Length": buf.length.toString(),
      },
    });
  } catch {
    return new NextResponse("Invalid image data", { status: 500 });
  }
}
