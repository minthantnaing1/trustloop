// app/admin/transactions/[id]/refund/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Product from "@/models/Product";
import User from "@/models/User";
import AdminRefundPanel from "@/components/admin/AdminRefundPanel";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function AdminRefundPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  await connectDB();

  const me = await User.findOne({ email: session.user.email })
    .select("role")
    .lean();

  if (!me || me.role !== "admin") {
    redirect("/home");
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return (
      <main className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
          <BackButton />
        </div>
        <div className="rounded-xl bg-white p-6 border">
          Transaction not found.
        </div>
      </main>
    );
  }

  const txn = await res.json();

  // Donations have no refund screen
  if (String(txn?.kind).toUpperCase() === "DONATION") {
    redirect("/admin/transactions");
  }

  return (
    <main className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#325082]">Refund</h1>
        <BackButton />
      </div>
      <AdminRefundPanel txn={txn} />
    </main>
  );
}
