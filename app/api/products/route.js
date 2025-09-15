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
    const type = searchParams.get("type"); // ← add this for type

    const user = session?.user?.email
      ? await User.findOne({ email: session.user.email })
      : null;

    const filters = {
      price: { $gte: minPrice, $lte: maxPrice },
      $or: [
        { isHidden: false },
        { isHidden: { $exists: false } },
        ...(user ? [{ owner: user._id }] : []),
      ],
    };

    if (search) filters.title = { $regex: search, $options: "i" };
    if (category) filters.category = category;
    if (condition) filters.condition = condition;
    if (location) filters.location = { $regex: location, $options: "i" };
    if (type) filters.type = type; // ← add this (e.g., "sell")

    const products = await Product.find(filters)
      .populate("owner")
      .sort({ createdAt: -1 });

    // attach buyer/info for reserved products (and include the order status)
    const reservedIds = products
      .filter((p) => p.isAvailable === false)
      .map((p) => p._id);

    let productsOut = products.map((p) => (p.toObject ? p.toObject() : p));

    if (reservedIds.length) {
      // get the most recent txn per product and include status
      const txns = await Transaction.find({ product: { $in: reservedIds } })
        .populate({ path: "buyer", select: "name email" })
        .sort({ createdAt: -1 })
        .lean();

      const infoByProduct = {};
      for (const t of txns) {
        const pid = String(t.product);
        if (infoByProduct[pid]) continue; // keep the most recent one only
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

    return new Response(
      JSON.stringify({
        products: productsOut,
        userEmail: session?.user?.email || "",
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
