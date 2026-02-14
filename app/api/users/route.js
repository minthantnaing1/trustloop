// app/api/users/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { name, email, image } = await req.json();

    await connectDB();

    const existing = await User.findOne({ email });

    // ✅ define developer emails here
    const DEV_EMAILS = ["u6530233@au.edu"];
    const isDev = DEV_EMAILS.includes(email);
    const isAdmin = isDev; // keep your current logic (only this email is admin)

    if (!existing) {
      await User.create({
        name,
        email,
        image,
        role: isAdmin ? "admin" : "user",
        adminRank: isDev ? "DEVELOPER" : "NORMAL",
      });

      return new Response(JSON.stringify({ created: true }), { status: 201 });
    }

    // ✅ keep existing role update behavior (minimal)
    if (isAdmin && existing.role !== "admin") {
      existing.role = "admin";
      await existing.save();
    }

    // ✅ ensure developer rank stays DEVELOPER for dev emails
    if (isDev && existing.adminRank !== "DEVELOPER") {
      existing.adminRank = "DEVELOPER";
      await existing.save();
    }

    return new Response(JSON.stringify({ created: false }), { status: 200 });
  } catch (err) {
    console.error("User DB Error:", err);
    return new Response("Error", { status: 500 });
  }
}
