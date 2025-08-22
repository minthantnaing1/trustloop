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
import CommentSection from "@/components/CommentSection";

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

  // Availability drives the UI:
  // - false => there is an active transaction (not cancelled/rejected), so hide buyer + seller controls
  // - true  => cancelled/rejected/no txn, show buyer actions and seller manage actions
  const canBuyerInteract = !isOwner && product.isAvailable === true;
  const canSellerManage = isOwner && product.isAvailable === true;

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-5 w-full">
        {/* Top Section */}
        <div className="flex justify-between items-start mb-4 flex-col sm:flex-row gap-4">
          {/* Back Button */}
          <Link
            href="/buy-sell"
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to Buy & Sell
          </Link>

          {/* Owner Action Buttons (hidden when product is locked by an active txn) */}
          {isOwner && canSellerManage && (
            <div className="flex gap-3 items-center sm:ml-auto sm:flex-row flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-transform duration-500 ease-in-out transform group hover:scale-[1.1] ${
                  !product.isHidden
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-600"
                } group`}
              >
                {!product.isHidden ? (
                  <>
                    <EyeIcon className="h-4 w-4 taransform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
                    Unhidden
                  </>
                ) : (
                  <>
                    <EyeSlashIcon className="h-4 w-4 transform transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]" />
                    Hidden
                  </>
                )}
              </span>

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

        {/* Main Content */}
        <div className="flex gap-[30px] flex-col sm:flex-row">
          {/* Left: Product Images */}
          <ProductImages
            images={product.images}
            defaultImage={product.defaultImage}
          />

          {/* Right: Product Info (below images on mobile) */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <p className="text-m text-gray-700">Category: {product.category}</p>
            <p className="text-lg font-semibold">
              {Number(product.price).toLocaleString()} ฿
            </p>

            {/* Buyer action buttons — only when available (i.e., not locked by an active txn) */}
            <div className="flex flex-wrap justify-center gap-2 w-full">
              {canBuyerInteract && (
                <>
                  <ActionButton
                    text="🛒 Add to Cart"
                    variant="cartPrimaryClick"
                    className="flex-[1]"
                  />

                  <Link
                    href={`/buy-sell/${product._id}/checkout`}
                    className="flex-[1.1]"
                  >
                    <ActionButton
                      text="🏷️ Buy Now"
                      variant="buyOutlineClick"
                      className="w-full"
                    />
                  </Link>

                  <ActionButton text="♡" variant="iconOutlineHover" />
                </>
              )}
            </div>

            {/* If the product is unavailable, you can optionally show a small notice */}
            {!product.isAvailable && (
              <p className="text-sm text-gray-600 mt-1">
                This item is currently in an active transaction.
              </p>
            )}

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description: {product.description || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Condition: {product.condition || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Meetup Location: {product.location || "-"}
            </div>

            <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <Image
                src={product.owner?.image || "/default-profile.png"}
                alt="Seller Image"
                width={60}
                height={60}
                className="rounded-full object-cover border-2 border-[#325082] w-[60px] h-[60px]"
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

            {/* Public Comments Section */}
            <CommentSection
              productId={product._id.toString()}
              initialComments={product.comments || []}
              userEmail={session?.user?.email}
              productOwnerEmail={product.owner?.email}
            />
          </div>
        </div>
      </main>
    </>
  );
}
