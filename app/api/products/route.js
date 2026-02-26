// app/api/products/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import { auth } from "@/auth";

// ✅ CREATE PRODUCT
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // ---- Minimal donation normalization/validation (only when type === "donation") ----
    if (body?.type === "donation") {
      body.donationMode = body.donationMode || "instant";

      // donations should be zero-price; don't override if client already set 0
      if (typeof body.price !== "number") body.price = 0;
      body.price = 0;

      if (mode === "instant") {
        delete body.requestDeadline;
      } else if (mode === "selective") {
        const dl = body.requestDeadline ? new Date(body.requestDeadline) : null;
        if (!dl || Number.isNaN(dl.getTime())) {
          return new Response(
            "requestDeadline is required for selective donation",
            { status: 400 },
          );
        }
        const now = new Date();
        if (dl <= now) {
          return new Response("requestDeadline must be in the future", {
            status: 400,
          });
        }
        // Optional hard cap (keep minimal but safe): max 14 days window
        const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (dl > max) {
          return new Response("requestDeadline too far. Max 14 days.", {
            status: 400,
          });
        }
        body.requestDeadline = dl;
      }

      // donation-only cleanup / ignore auction fields if sent
      delete body.startingPrice;
      delete body.currentBid;
      delete body.bidHistory;
      delete body.auctionEndsAt;
    } else {
      // Non-donation: ignore donation-only fields if sent
      delete body.donationMode;
      delete body.requestDeadline;
    }
    // -------------------------------------------------------------------------------

    // ---- Minimal auction normalization/validation (only when type === "auction") ----
    if (body?.type === "auction") {
      // keep schema happy (auction doesn't use `price`)
      if (typeof body.price !== "number") body.price = 0;
      body.price = 0;

      const sp = Number(body.startingPrice);
      if (!Number.isFinite(sp) || sp < 1000) {
        return new Response(
          "startingPrice is required and must be at least 1000",
          {
            status: 400,
          },
        );
      }
      body.startingPrice = sp;

      const ends = body.auctionEndsAt ? new Date(body.auctionEndsAt) : null;
      if (!ends || Number.isNaN(ends.getTime())) {
        return new Response("auctionEndsAt is required for auction", {
          status: 400,
        });
      }

      const now = new Date();
      if (ends <= now) {
        return new Response("auctionEndsAt must be in the future", {
          status: 400,
        });
      }

      // hard cap (match donation style): max 14 days
      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (ends > max) {
        return new Response("auctionEndsAt too far. Max 14 days.", {
          status: 400,
        });
      }

      body.auctionEndsAt = ends;

      // initialize bid fields safely
      if (body.currentBid && typeof body.currentBid === "object") {
        // allow currentBid only if structure is valid-ish; otherwise clear
        if (
          typeof body.currentBid.amount !== "number" ||
          !body.currentBid.bidder
        ) {
          delete body.currentBid;
        }
      } else {
        delete body.currentBid;
      }

      if (!Array.isArray(body.bidHistory)) body.bidHistory = [];

      // auction should not accept donation-only fields
      delete body.donationMode;
      delete body.requestDeadline;
      delete body.acceptedBy;
    } else {
      // Non-auction: ignore auction-only fields if sent
      delete body.startingPrice;
      delete body.currentBid;
      delete body.bidHistory;
      delete body.auctionEndsAt;
    }
    // -------------------------------------------------------------------------------

    const created = await Product.create({
      ...body,
      owner: user._id,
    });

    return new Response(JSON.stringify(created), { status: 201 });
  } catch (err) {
    console.error("❌ Product POST error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ GET PRODUCTS (With filters + return userEmail)
export async function GET(req) {
  try {
    const session = await auth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const minPrice = parseFloat(searchParams.get("minPrice")) || 0;
    const maxPrice = parseFloat(searchParams.get("maxPrice")) || 999999999;
    const condition = searchParams.get("condition");
    const location = searchParams.get("location");
    const type = searchParams.get("type");
    const donationMode = searchParams.get("donationMode");

    const user = session?.user?.email
      ? await User.findOne({ email: session.user.email })
      : null;

    // ✅ Base filters (hide hidden unless owner)
    const filters = {
      $or: [
        { isHidden: false },
        { isHidden: { $exists: false } },
        ...(user ? [{ owner: user._id }] : []),
      ],
    };

    // ✅ Apply price filter only for sell/request (not donation, not auction)
    if (type !== "donation" && type !== "auction") {
      filters.price = { $gte: minPrice, $lte: maxPrice };
    } else if (type === "donation") {
      filters.price = 0; // donations are always free
    } else if (type === "auction") {
      // auctions use startingPrice/currentBid; no price filter
    }

    // ✅ Apply optional filters
    if (search) filters.title = { $regex: search, $options: "i" };
    if (category) filters.category = category;
    if (condition) filters.condition = condition;
    if (location) filters.location = { $regex: location, $options: "i" };
    if (type) filters.type = type;
    if (type === "donation" && donationMode)
      filters.donationMode = donationMode;

    // ✅ Sorting
    let sortQuery = { createdAt: -1 };

    if (type === "donation") {
      sortQuery =
        donationMode === "selective"
          ? { createdAt: -1, requestDeadline: 1 }
          : { createdAt: -1 };
    }

    if (type === "auction") {
      // ending soon first (so users see urgent auctions)
      sortQuery = { auctionEndsAt: 1, createdAt: -1 };
    }

    const products = await Product.find(filters)
      .populate("owner")
      .sort(sortQuery);

    // attach buyer/info for reserved products (and include the order status)
    const reservedIds = products
      .filter((p) => p.isAvailable === false)
      .map((p) => p._id);

    let productsOut = products.map((p) => (p.toObject ? p.toObject() : p));

    if (reservedIds.length) {
      const txns = await Transaction.find({ product: { $in: reservedIds } })
        .populate({ path: "buyer", select: "name email" })
        .sort({ createdAt: -1 })
        .lean();

      const infoByProduct = {};
      for (const t of txns) {
        const pid = String(t.product);
        if (infoByProduct[pid]) continue;
        infoByProduct[pid] = {
          buyerName: t?.buyer?.name || t?.buyer?.email || "",
          buyerEmail: t?.buyer?.email || "",
          buyerOrderId: String(t._id),
          buyerOrderStatus: t?.status || "",
        };
      }

      productsOut = productsOut.map((p) => {
        const info = infoByProduct[String(p._id)];
        if (info) {
          p.buyerName = info.buyerName;
          p.buyerEmail = info.buyerEmail;
          p.buyerOrderId = info.buyerOrderId;
          p.buyerOrderStatus = info.buyerOrderStatus;
        }
        return p;
      });
    }

    // ✅ Optional: mark expired selective donations + ended auctions
    const now = new Date();

    productsOut = productsOut.map((p) => {
      if (
        p.type === "donation" &&
        p.donationMode === "selective" &&
        p.requestDeadline &&
        new Date(p.requestDeadline) < now
      ) {
        p.expired = true;
      }

      if (p.type === "auction" && p.auctionEndsAt) {
        const end = new Date(p.auctionEndsAt);
        if (!Number.isNaN(end.getTime()) && end < now) {
          p.ended = true; // helpful for UI filtering
        }
      }

      return p;
    });

    return new Response(
      JSON.stringify({
        products: productsOut,
        userEmail: session?.user?.email || "",
      }),
      { status: 200 },
    );
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
