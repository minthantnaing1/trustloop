import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import User from "@/models/User";
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

    const filters = {
      isAvailable: true,
      price: { $gte: minPrice, $lte: maxPrice },
    };

    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    if (category) {
      filters.category = category;
    }

    if (condition) {
      filters.condition = condition;
    }

    if (location) {
      filters.location = { $regex: location, $options: "i" };
    }

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

// ✅ DELETE PRODUCT (With owner check)
export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return new Response("Product ID is required", { status: 400 });
    }

    await connectDB();

    const product = await Product.findById(id).populate("owner");
    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    // ✅ Check if current user is the owner
    if (product.owner.email !== session.user.email) {
      return new Response("Unauthorized - Not your product", { status: 403 });
    }

    await Product.findByIdAndDelete(id);

    return new Response("Deleted successfully", { status: 200 });
  } catch (err) {
    console.error("❌ Product DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
