// app/api/products/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Product from "@/models/Product";
import Transaction from "@/models/Transaction";
import Auction from "@/models/Auction"; // ✅ NEW
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

    // ---- Donation normalization/validation (only when type === "donation") ----
    if (body?.type === "donation") {
      body.donationMode = body.donationMode || "instant";
      const mode = body.donationMode;

      body.price = 0; // donations are free

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
        const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        if (dl > max) {
          return new Response("requestDeadline too far. Max 14 days.", {
            status: 400,
          });
        }
        body.requestDeadline = dl;
      } else {
        body.donationMode = "instant";
        delete body.requestDeadline;
      }

      // ✅ donation cleanup: remove auction fields if sent
      delete body.startingPrice;
      delete body.auctionEndsAt;
      delete body.auctionStatus;
    } else {
      // Non-donation: ignore donation-only fields if sent
      delete body.donationMode;
      delete body.requestDeadline;
    }
    // ------------------------------------------------------------------------

    // ---- Auction normalization/validation (only when type === "auction") ----
    let auctionCreatePayload = null;

    if (body?.type === "auction") {
      // keep Product schema happy
      body.price = 0;

      const sp = Number(body.startingPrice);
      if (!Number.isFinite(sp) || sp < 10) {
        return new Response(
          "startingPrice is required and must be at least 10",
          { status: 400 },
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

      const max = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (ends > max) {
        return new Response("auctionEndsAt too far. Max 14 days.", {
          status: 400,
        });
      }

      body.auctionEndsAt = ends;

      // ✅ Product stores only posting info
      body.auctionStatus = body.auctionStatus || "OPEN";

      // ✅ Ensure auction does not accept donation-only fields
      delete body.donationMode;
      delete body.requestDeadline;
      delete body.acceptedBy;

      // ✅ Prepare Auction engine doc payload (created after product)
      auctionCreatePayload = {
        seller: user._id,
        startingPrice: sp,
        endsAt: ends,
        status: "OPEN",
        currentBid: { amount: 0 }, // no bidder yet
        bidHistory: [],
        queue: [],
        currentIndex: 0,
      };
    } else {
      // Non-auction: ignore auction-only fields if sent
      delete body.startingPrice;
      delete body.auctionEndsAt;
      delete body.auctionStatus;
    }
    // ------------------------------------------------------------------------

    // ✅ Create Product first
    const createdProduct = await Product.create({
      ...body,
      owner: user._id,
    });

    // ✅ If it's an auction, create the Auction engine record too
    if (auctionCreatePayload) {
      try {
        await Auction.create({
          ...auctionCreatePayload,
          product: createdProduct._id,
        });
      } catch (e) {
        // rollback product to avoid "broken auction posts"
        await Product.deleteOne({ _id: createdProduct._id });
        console.error("❌ Auction create failed (rollback product):", e);
        return new Response("Failed to create auction engine", { status: 500 });
      }
    }

    return new Response(JSON.stringify(createdProduct), { status: 201 });
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

    // ✅ Apply price filter only for sell/request or auction (not donation)
    if (type !== "donation" && type !== "auction") {
      filters.price = { $gte: minPrice, $lte: maxPrice };
    } else if (type === "donation") {
      filters.price = 0;
    } else if (type === "auction") {
      filters.startingPrice = { $gte: minPrice, $lte: maxPrice };
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
      // ending soon first
      sortQuery = { auctionEndsAt: 1, createdAt: -1 };
    }

    const products = await Product.find(filters)
      .populate("owner")
      .sort(sortQuery);

    // attach buyer/info for reserved products
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
          p.ended = true;
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
