import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET(req) {
  const session = await auth();
  await connectDB();

  if (!session) {
    return new Response(JSON.stringify({ role: "guest" }), { status: 200 });
  }

  const user = await User.findOne({ email: session.user.email });
  return new Response(JSON.stringify({ role: user?.role || "user" }), {
    status: 200,
  });
}
