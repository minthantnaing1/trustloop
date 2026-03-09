// app/api/donations/instant/route.js
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { notifyTxnEvent } from "@/lib/notify";

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email)
      return new Response("Unauthorized", { status: 401 });

    const { productId, reason } = await req.json();
    if (!productId || !reason || reason.trim().length < 5) {
      return new Response("Reason is required (min 5 chars).", {
        status: 400,
      });
    }

    await connectDB();

    const me = await User.findOne({ email: session.user.email });
    if (!me) return new Response("Unauthorized", { status: 401 });

    const product = await Product.findById(productId).populate("owner");
    if (!product) return new Response("Product not found", { status: 404 });

    if (product.type !== "donation")
      return new Response("Not a donation item.", { status: 400 });

    if (String(product.owner?._id) === String(me._id))
      return new Response("You cannot request your own donation.", {
        status: 403,
      });

    if (product.isAvailable === false)
      return new Response("This item is already reserved/unavailable.", {
        status: 409,
      });

    if (product.donationMode !== "instant")
      return new Response("This donation is selective only.", { status: 400 });

    // Reserve the item
    product.isAvailable = false;
    await product.save();

    // Create zero-cost DONATION txn, meetup-only
    const txn = await Transaction.create({
      kind: "DONATION",
      product: product._id,
      buyer: me._id,
      seller: product.owner?._id || product.owner,
      status: "AWAITING_DONOR", // donor must still confirm
      price: 0,
      fee: 0,
      total: 0,
      sellerNet: 0,
      buyerLocation:
        String(me.location || "").trim() || "Assumption University",
      requestReason: reason.trim(), // 👈 store requester’s reason properly
      timeline: [
        {
          by: me._id,
          action: "DONATION_INSTANT_CREATED",
          meta: { reason: reason.trim() },
        },
      ],
    });

    // 🔔 notify donor/recipient/admins
    await notifyTxnEvent({
      txn,
      actorId: me._id,
      type: "DONATION_INSTANT_CREATED",
    });

    return new Response(
      JSON.stringify({ ok: true, orderId: String(txn._id) }),
      { status: 200 },
    );
  } catch (e) {
    console.error("instant-claim POST error:", e);
    return new Response("Server Error", { status: 500 });
  }
}
