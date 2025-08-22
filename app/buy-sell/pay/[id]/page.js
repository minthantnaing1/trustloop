// app/pay/[id]/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import PayPanel from "@/components/PayPanel";

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
  const txn = await res.json();

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[120px] mb-[40px] px-4 w-full overflow-x-hidden">
        <h1 className="text-2xl font-bold text-[#325082] mb-4">Pay & Upload</h1>

        {/* Stepper */}
        <div className="mb-5">
          <ol className="flex items-center text-sm">
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                1
              </span>
              Review
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center font-semibold text-[#325082]">
              <span className="w-6 h-6 rounded-full bg-[#325082] text-white flex items-center justify-center text-xs mr-2">
                2
              </span>
              Pay & Upload
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                3
              </span>
              Deliver
            </li>
            <span className="mx-3 h-[2px] w-10 bg-[#cfd8e3] block" />
            <li className="flex items-center text-gray-500">
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs mr-2">
                4
              </span>
              Payout
            </li>
          </ol>
        </div>

        <PayPanel txn={txn} sessionEmail={session?.user?.email} />
      </main>
    </>
  );
}
