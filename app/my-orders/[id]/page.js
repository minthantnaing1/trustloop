// app/my-orders/[id]/page.js
import NavBar from "@/components/NavBar";
import OrderDetail from "./OrderDetail";
import BackButton from "@/components/BackButton";

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto px-3 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Order Details</h1>
          <BackButton />
        </div>

        <OrderDetail id={id} />
      </main>
    </>
  );
}
