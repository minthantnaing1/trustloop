// app/api/admin/sidebar-badges/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import SupportTicket from "@/models/SupportTicket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await connectDB();

  const session = await auth();
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();

  if (!me || String(me.role || "").toLowerCase() !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const paidKinds = ["BUY_SELL", "AUCTION"];

  const [txnNeedsAction, supportOpen] = await Promise.all([
    Transaction.countDocuments({
      kind: { $in: paidKinds },
      $or: [
        {
          status: "BUYER_CONFIRMED",
        },
        {
          hasPaymentSucceeded: true,
          status: { $in: ["CANCELLED_BY_BUYER", "CANCELLED_BY_SELLER"] },
          $or: [
            { adminRefundReceiptUrl: { $exists: false } },
            { adminRefundReceiptUrl: "" },
            { adminRefundReceiptUrl: null },
          ],
        },
      ],
    }),

    SupportTicket.countDocuments({
      status: "OPEN",
    }),
  ]);

  return Response.json({
    transactions: txnNeedsAction || 0,
    support: supportOpen || 0,
  });
}
