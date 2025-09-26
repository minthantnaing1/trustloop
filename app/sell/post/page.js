// app/sell/post/page.js
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import SellPostClient from "./SellPostClient";

export const dynamic = "force-dynamic";

export default async function SellPostPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/"); // not logged in
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("defaultScanCode phone location")
    .lean();

  // ✅ block if profile incomplete
  if (!me?.defaultScanCode || !me?.phone || !me?.location) {
    redirect("/sell"); // just send them back to Sell page
  }

  const initialLocation = me.location || "";

  return (
    <>
      <NavBar />
      <SellPostClient initialLocation={initialLocation} />
    </>
  );
}
