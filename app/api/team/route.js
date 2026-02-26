import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

// ✅ ORDER + DISPLAY TITLE (NOT permission role)
const TEAM = [
  { email: "u6530233@au.edu", title: "Full Stack Developer/Admin" },
  { email: "u6530230@au.edu", title: "Developer/Admin" },
  { email: "u6511089@au.edu", title: "Developer/Admin" },
  { email: "u6530239@au.edu", title: "Admin" },
];

export async function GET() {
  try {
    await connectDB();

    const emails = TEAM.map((m) => m.email);

    const users = await User.find({ email: { $in: emails } })
      .select("name image email")
      .lean();

    // ✅ preserve TEAM order and attach title
    const ordered = TEAM.map((member) => {
      const u = users.find((x) => x.email === member.email);
      return {
        email: member.email,
        title: member.title,
        name: u?.name || "Unnamed",
        image: u?.image || "",
      };
    });

    return Response.json(ordered, { status: 200 });
  } catch (err) {
    console.error("❌ Team fetch error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
