// app/pay/[id]/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import PayPanel from "@/components/PayPanel";
import Stepper from "@/components/Stepper";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export default async function PayPage({ params }) {
  const { id } = await params; // transactionId
  const cookieStore = await cookies();
  const session = await auth();

  // Fetch the transaction with product populated
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  if (!res.ok) return <div>Transaction not found.</div>;
  let txn = await res.json();

  // after fetching: const txn = await res.json();

  if (!txn.expiresAt && txn.status === "PENDING_UPLOAD") {
    const armRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
      {
        method: "PATCH",
        headers: {
          Cookie: cookieStore.toString(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start_payment_window" }),
        cache: "no-store",
      }
    );

    if (armRes.ok) {
      const { expiresAt } = await armRes.json();
      txn.expiresAt = expiresAt;
    }

    // ✅ force a re-fetch of txn so PayPanel sees DB value
    const res2 = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
      {
        headers: { Cookie: cookieStore.toString() },
        cache: "no-store",
      }
    );
    txn = await res2.json();
  }

  const productId = txn?.product?._id ?? txn?.product ?? null;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Checkout</h1>
        </div>

        {/* Progress Stepper (buyer, step 2) */}
        <div className="mb-5">
          <Stepper current={2} variant="buyer" className="px-1" />
        </div>

        <PayPanel txn={txn} sessionEmail={session?.user?.email} />
      </main>
    </>
  );
}
