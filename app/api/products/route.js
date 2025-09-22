import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
import { auth } from "@/auth";

// ✅ CREATE PRODUCT or DONATION
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    // Normalize donation payload
    if (body.type === "donation") {
      body.price = 0; // donations always free
    }

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

// ✅ GET PRODUCTS (filters + donations support)
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
    const type = searchParams.get("type"); // 👈 NEW
    const notType = searchParams.get("notType");

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
    if (type) filters.type = type; // 👈 filter donations vs products
    if (notType) filters.type = { $ne: notType };
    
    const products = await Product.find(filters)
      .populate("owner")
      .sort({ createdAt: -1 });

    return new Response(
      JSON.stringify({ products, userEmail: session?.user?.email || "" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Product GET error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
