// app/auction/post/page.js
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import AuctionPostClient from "./AuctionPostClient";

export const dynamic = "force-dynamic";

export default async function AuctionPostPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("defaultScanCode phone location")
    .lean();

  // ✅ block if profile incomplete (same as Donation)
  if (!me?.defaultScanCode || !me?.phone || !me?.location) {
    redirect("/auction");
  }

  const initialLocation = me.location || "";

  return (
    <>
      <NavBar />
      <AuctionPostClient initialLocation={initialLocation} />
    </>
  );
}
