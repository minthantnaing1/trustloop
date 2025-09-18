// app/pay/[id]/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import PayPanel from "@/components/PayPanel";
import Stepper from "@/components/Stepper";
import { redirect } from "next/navigation"; // ← add this

export default async function PayPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
  );
  if (!res.ok) return redirect("/my-orders");

  let txn = await res.json();

  // If the order is NOT in PENDING_UPLOAD, never show the pay panel
  const notPayable =
    txn.status !== "PENDING_UPLOAD" ||
    !!txn.buyerReceiptUrl || // already uploaded
    txn.cancelReason || // cancelled for any reason
    false;

  if (notPayable) {
    return redirect("/my-orders");
  }

  // Arm the timer once (same as before)…
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
    // Re-fetch authoritative txn so we respect any auto-cancel in GET handler
    const res2 = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transactions/${id}`,
      { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
    );
    txn = await res2.json();

    // After re-fetch, if state changed, bounce out
    const stillPayable =
      txn.status === "PENDING_UPLOAD" &&
      !txn.buyerReceiptUrl &&
      !txn.cancelReason;
    if (!stillPayable) return redirect("/my-orders");
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full overflow-x-hidden">
        <div className="mb-5">
          <Stepper current={2} variant="buyer" className="px-1" />
        </div>
        <PayPanel txn={txn} sessionEmail={session?.user?.email} />
      </main>
    </>
  );
}
