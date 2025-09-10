// app/my-orders/[id]/page.js
import NavBar from "@/components/NavBar";
import Link from "next/link";
import OrderDetail from "./OrderDetail";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Order Details</h1>
          <Link
            href={`/my-orders`}
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to My Orders
          </Link>
        </div>

        <OrderDetail id={id} />
      </main>
    </>
  );
}
