// app/api/users/route.js
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { name, email, image } = await req.json();

    await connectDB();

    const existing = await User.findOne({ email });

    if (!existing) {
      await User.create({ name, email, image });
      return new Response(JSON.stringify({ created: true }), { status: 201 });
    }

    return new Response(JSON.stringify({ created: false }), { status: 200 });
  } catch (err) {
    console.error("User DB Error:", err);
    return new Response("Error", { status: 500 });
  }
}
