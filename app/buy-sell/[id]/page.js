import NavBar from "@/components/NavBar";
import Image from "next/image";
import { cookies } from "next/headers";
import { auth } from "@/auth";

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return <div>Product not found.</div>;
  }

  const product = await res.json();
  const session = await auth();
  const sessionEmail = session?.user?.email || "";
  const isOwner = sessionEmail === product.owner?.email;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mt-[120px] mb-[40px] px-5">
        <div className="flex gap-[30px]">
          {/* Left: Product Images */}
          <div className="flex-1">
            <div className="h-[300px] bg-[#ddd] rounded-[10px]" />
            <div className="flex gap-2 mt-2">
              {Array(5)
                .fill(0)
                .map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[60px] h-[60px] bg-[#ccc] rounded-[6px]"
                  />
                ))}
            </div>
          </div>

          {/* Right: Product Info */}
          {isOwner ? (
            <div className="flex-1 flex flex-col gap-4 bg-white rounded-xl shadow-lg p-6 border border-[#ccc]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#325082]">
                    {product.title}
                  </h2>
                  <p className="text-m text-gray-700 mt-1">
                    Category: {product.category}
                  </p>
                  <p className="text-lg font-semibold mt-2">
                    {Number(product.price).toLocaleString()} ฿
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${
                      product.isAvailable
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.isAvailable ? "🔓 Available" : "🔒 Hidden"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-[#325082] text-[#325082] rounded-md hover:bg-[#f0f4ff] font-medium">
                  ✏️ Edit Post
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 font-medium">
                  🗑️ Delete Post
                </button>
              </div>

              <div className="bg-[#f9f9f9] p-4 rounded-md">
                <h4 className="text-sm font-semibold mb-1 text-gray-700">
                  Description
                </h4>
                <p className="text-sm text-gray-800">
                  {product.description || "-"}
                </p>
              </div>

              <div className="bg-[#f9f9f9] p-4 rounded-md">
                <h4 className="text-sm font-semibold mb-1 text-gray-700">
                  Meetup Location
                </h4>
                <p className="text-sm text-gray-800">
                  {product.location || "-"}
                </p>
              </div>

              <div className="text-sm text-gray-500 text-right italic">
                You are viewing your own listing.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              <h2 className="text-xl font-bold text-[#325082]">
                {product.title}
              </h2>
              <p className="text-m text-gray-700">
                Category: {product.category}
              </p>
              <p className="text-lg font-semibold">
                <b>{product.price} ฿</b>
              </p>

              <div className="flex gap-2">
                <button className="flex-1 bg-[#325082] text-white px-4 py-2 rounded-md hover:opacity-90">
                  ADD TO CART 🛒
                </button>
                <button className="flex-1 bg-white border-[2px] border-[#325082] text-[#325082] px-4 py-2 rounded-md hover:opacity-90">
                  BUY NOW
                </button>
                <button className="bg-white border border-[#ccc] px-4 py-2 rounded-md hover:opacity-90">
                  ♡
                </button>
              </div>

              <div className="bg-[#e2e2e2] p-3 rounded-md">
                Description: {product.description || "-"}
              </div>
              <div className="bg-[#e2e2e2] p-3 rounded-md">
                Meetup Location: {product.location || "-"}
              </div>

              <div>
                <p>Comment</p>
                <input
                  type="text"
                  placeholder="Ask Questions about Products..."
                  className="w-full p-[12px] border border-[#ccc] rounded-[6px] outline-none"
                />
              </div>

              <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
                <Image
                  src={product.owner?.image || "/default-profile.png"}
                  alt="Seller Image"
                  width={50}
                  height={50}
                  className="rounded-full object-cover border-2 border-[#325082]"
                />
                <div className="flex flex-col">
                  <h3 className="font-normal">Seller:</h3>
                  <p className="font-semibold text-[#222]">
                    {product.owner?.name}
                  </p>
                  <p className="text-[14px] text-[#555]">
                    {product.owner?.email}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
