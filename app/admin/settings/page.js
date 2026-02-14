import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { redirect } from "next/navigation";
import AdminSettingsClient from "./AdminSettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/");

  await connectDB();
  const me = await User.findOne({ email }).select("role").lean();
  if (!me || String(me.role) !== "admin") redirect("/home");

  // client will fetch settings itself
  return <AdminSettingsClient />;
}
