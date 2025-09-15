import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import EditForm from "./EditForm";

export default async function ProfileEditPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  await connectDB();
  const me = await User.findOne({ email: session.user.email }).lean();
  if (!me?._id) redirect("/");

  const initialUser = {
    _id: me._id.toString(),
    name: me.name || "",
    image: me.image || "/default-profile.jpg",
    phone: me.phone || "",
    faculty: me.faculty || "",
    year: me.year || "",
    location: me.location || "",
    defaultScanCode: me.defaultScanCode || "",
    bankAccountName: me.bankAccountName || "",
    bankAccountNumber: me.bankAccountNumber || "",
  };

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3">
        <h1 className="text-2xl font-bold text-[#325082] mb-6">
          Edit My Profile
        </h1>
        <EditForm initialUser={initialUser} />
      </main>
    </>
  );
}
