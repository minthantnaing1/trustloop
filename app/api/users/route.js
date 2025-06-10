// app/api/users/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { name, email, image } = await req.json();

    await connectDB();

    const existing = await User.findOne({ email });

    if (!existing) {
      const isAdmin = email === "u6530233@au.edu";

      await User.create({
        name,
        email,
        image,
        role: isAdmin ? "admin" : "user",
      });

      return new Response(JSON.stringify({ created: true }), { status: 201 });
    }

    // ✅ Update existing user’s role if needed
    const isAdmin = email === "u6530233@au.edu";
    if (isAdmin && existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }

    return new Response(JSON.stringify({ created: false }), { status: 200 });
  } catch (err) {
    console.error("User DB Error:", err);
    return new Response("Error", { status: 500 });
  }
}
