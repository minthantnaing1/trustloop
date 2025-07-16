import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  await connectDB();

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return new Response(JSON.stringify(user), { status: 200 });
}
