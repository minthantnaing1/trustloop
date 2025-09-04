import { cookies } from "next/headers";
import { auth } from "@/auth";
import AdminPayoutPanel from "@/components/admin/AdminPayoutPanel";
import Link from "next/link";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export const dynamic = "force-dynamic";

export default async function AdminPayoutPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();

  if (!session?.user?.email) {
    return <div className="p-6">Unauthorized</div>;
  }

  // fetch the full txn (server component)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return (
      <main className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
          <Link
            href="/admin/transactions"
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to Transactions
          </Link>
        </div>
        <div className="rounded-xl bg-white p-6 border">
          Transaction not found.
        </div>
      </main>
    );
  }

  const txn = await res.json();

  return (
    <main className="max-w-[1200px] mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#325082]">Payout</h1>
        <Link
          href="/admin/transactions"
          className="text-[#325082] text-sm hover:underline flex items-center gap-1"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Transactions
        </Link>
      </div>
      <AdminPayoutPanel txn={txn} />
    </main>
  );
}
