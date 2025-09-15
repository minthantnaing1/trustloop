import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import SellPostClient from "./SellPostClient";

export default async function SellPostPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/");
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email })
    .select("location")
    .lean();

  const initialLocation = me?.location || "";

  return (
    <>
      <NavBar />
      <SellPostClient initialLocation={initialLocation} />
    </>
  );
}
