import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import DonationPostClient from "./DonationPostClient";

export const dynamic = "force-dynamic";

export default async function DonationPostPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/"); // not logged in
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("defaultScanCode phone location")
    .lean();

  // ✅ block if profile incomplete (same as Sell)
  if (!me?.defaultScanCode || !me?.phone || !me?.location) {
    redirect("/donation"); // send them back to Donation page
  }

  const initialLocation = me.location || "";

  return (
    <>
      <NavBar />
      <DonationPostClient initialLocation={initialLocation} />
    </>
  );
}
