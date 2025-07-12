import NavBar from "@/components/NavBar";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import ActionButton from "@/components/ActionButton";
import ProductDeleteButton from "@/components/ProductDeleteButton";
import ProductImages from "@/components/ProductImages";

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
        <div className="flex justify-between items-start mb-4">
          {/* Back Button */}
          <Link
            href="/buy-sell"
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to Buy & Sell
          </Link>

          {/* Owner Action Buttons */}
          {isOwner && (
            <div className="flex gap-3 items-center">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-transform duration-500 ease-in-out transform group hover:scale-[1.1] ${
                  product.isAvailable
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                } group`}
              >
                {product.isAvailable ? (
                  <>
                    <EyeIcon className="h-4 w-4 taransform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
                    Available
                  </>
                ) : (
                  <>
                    <EyeSlashIcon className="h-4 w-4 transform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
                    Hidden
                  </>
                )}
              </span>

              {/* Edit & Delete Button */}
              <Link href={`/buy-sell/${product._id}/edit`}>
                <ActionButton
                  text="Edit"
                  variant="outlineHover"
                  icon={<PencilIcon className="w-5 h-5" />}
                />
              </Link>

              <ProductDeleteButton productId={product._id} />
            </div>
          )}
        </div>

        <div className="flex gap-[30px]">
          {/* Left: Product Images */}
          <ProductImages
            images={product.images}
            defaultImage={product.defaultImage}
          />

          {/* Right: Product Info */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <p className="text-m text-gray-700">Category: {product.category}</p>
            <p className="text-lg font-semibold">
              {Number(product.price).toLocaleString()} ฿
            </p>

            {/* Buttons */}
            <div className="flex gap-2 relative group">
              {isOwner ? (
                <>
                  {/* Disabled Add to Cart */}
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed border border-gray-300"
                  >
                    🛒 Add to Cart
                  </button>

                  {/* Disabled Buy Now */}
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-400 border-2 border-gray-300 px-4 py-2 rounded-md cursor-not-allowed"
                  >
                    🏷️ Buy Now
                  </button>

                  {/* Disabled Heart */}
                  <button
                    disabled
                    className="flex items-center justify-center text-gray-400 text-[25px] px-4 border-[1.5px] border-gray-300 rounded-md cursor-not-allowed"
                  >
                    ♡
                  </button>

                  {/* Tooltip Overlay */}
                  <div className="absolute top-[-32px] left-[175px] w-max bg-[#325082] text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition duration-700 z-10">
                    You cannot like, buy or cart your own item!
                  </div>
                </>
              ) : (
                <>
                  <button className="flex-1 bg-[#325082] text-white px-4 py-2 rounded-md hover:opacity-90">
                    🛒 Add to Cart
                  </button>
                  <button className="flex-1 bg-white border-[2px] border-[#325082] text-[#325082] px-4 py-2 rounded-md hover:opacity-90">
                    🏷️ Buy Now
                  </button>
                  <button className="bg-white text-[#325082] text-[25px] border-[1.5px] border-gray-400 px-4 rounded-md hover:opacity-90">
                    ♡
                  </button>
                </>
              )}
            </div>

            {/* Description */}
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description: {product.description || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Condition: {product.condition || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Meetup Location: {product.location || "-"}
            </div>

            {/* Comment */}
            {!isOwner && (
              <div>
                <p>Comment</p>
                <input
                  type="text"
                  placeholder="Ask Questions about Products..."
                  className="w-full p-[12px] border border-[#ccc] rounded-[6px] outline-none"
                />
              </div>
            )}

            {/* Seller Info */}
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
        </div>
      </main>
    </>
  );
}
