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

export default async function DonationDetailPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return <div>Donation not found.</div>;
  }

  const product = await res.json();

  // Treat price===0 or type==="donation" as donation items
  const isDonation =
    product?.type === "donation" || Number(product?.price) === 0;

  const session = await auth();
  const sessionEmail = session?.user?.email || "";
  const isOwner = sessionEmail === product.owner?.email;

  // Visibility/availability flags
  const isHidden = Boolean(product?.isHidden);
  const isAvailable = product?.isAvailable ?? true;

  // Optional extra attributes if your schema has them
  const size = product?.size || null;
  const color = product?.color || null;
  const age = product?.age || null;

  // Donor display data (replace with real fields when available)
  const donorName = product?.owner?.name || "Anonymous";
  const donorImage = product?.owner?.image || "/default-profile.png";
  const donorRating = product?.owner?.rating ?? 5.0; // placeholder
  const donorDonationCount = product?.owner?.donationsCount ?? 12; // placeholder
  const donorBio =
    product?.owner?.bio ||
    "Fellow AU student happy to help the campus community.";

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-5 w-full">
        {/* Top Section */}
        <div className="flex justify-between items-start mb-4 flex-col sm:flex-row gap-4">
          {/* Back Button */}
          <Link
            href="/donation"
            className="text-[#325082] text-sm hover:underline flex items-center gap-1"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back to Donations
          </Link>

          {/* Owner Action Buttons */}
          {isOwner && (
            <div className="flex gap-3 items-center sm:ml-auto sm:flex-row flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-transform duration-500 ease-in-out transform group hover:scale-[1.1] ${
                  isHidden
                    ? "bg-gray-200 text-gray-600"
                    : isAvailable
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isHidden ? (
                  <>
                    <EyeSlashIcon className="h-4 w-4" />
                    Hidden
                  </>
                ) : isAvailable ? (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    Reserved
                  </>
                )}
              </span>

              {/* Edit route under /donation */}
              <Link href={`/donation/${product._id}/edit`}>
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
          {/* Left: Images */}
          <ProductImages
            images={product.images}
            defaultImage={product.defaultImage}
          />

          {/* Right: Info & Sections */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <p className="text-m text-gray-700">Category: {product.category}</p>

            {/* Price (donations = Free) */}
            <p className="text-lg font-bold text-green-600">
              {isDonation
                ? "Free"
                : `${Number(product.price).toLocaleString()} ฿`}
            </p>

            {/* Actions for non-owner (Donation flow) */}
            {!isOwner && (
              <div className="flex flex-wrap justify-center gap-2 w-full">
                <Link
                  href={`/donation/${product._id}/request`}
                  className="flex-[1]"
                >
                  
                </Link>
                {/* Keep heart here OR in Donor card below; avoid duplicates if you add it there */}
                {/* <ActionButton text="♡" variant="iconOutlineHover" /> */}
              </div>
            )}

            {/* Donor Information (no Avatar, no shadcn) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Donor Information</h3>
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src={donorImage}
                  alt={donorName}
                  width={48}
                  height={48}
                  className="rounded-full object-cover border border-gray-300 w-12 h-12"
                />
                <div>
                  <h4 className="font-semibold">{donorName}</h4>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>⭐ {donorRating.toFixed(1)}</span>
                    <span>({donorDonationCount} donations)</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{donorBio}</p>
              <div className="flex gap-2">
                <Link
                  href={`/donation/${product._id}/contact`}
                  className="flex-1"
                >
                  <ActionButton
                    text="Contact Donor"
                    variant="primaryClick"
                    className="w-full"
                  />
                </Link>
                <ActionButton text="♡" variant="iconOutlineHover" />
              </div>
            </div>

            {/* Item Details (no shadcn) */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-3">Item Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <p>
                  <span className="text-gray-500">Condition:</span>{" "}
                  <span className="font-medium">
                    {product.condition || "-"}
                  </span>
                </p>
                {size && (
                  <p>
                    <span className="text-gray-500">Size:</span>{" "}
                    <span className="font-medium">{size}</span>
                  </p>
                )}
                {color && (
                  <p>
                    <span className="text-gray-500">Color:</span>{" "}
                    <span className="font-medium">{color}</span>
                  </p>
                )}
                {age && (
                  <p>
                    <span className="text-gray-500">Age:</span>{" "}
                    <span className="font-medium">{age}</span>
                  </p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-gray-600">
                    {product.description || "No description provided."}
                  </p>
                </div>

                {product?.recipientNote && (
                  <div>
                    <h4 className="font-medium mb-1">Recipient Note</h4>
                    <p className="text-sm text-gray-600">
                      {product.recipientNote}
                    </p>
                  </div>
                )}

                {Array.isArray(product.includes) &&
                  product.includes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">What's Included</h4>
                      <ul className="text-sm text-gray-600 list-disc pl-5">
                        {product.includes.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div>
                  <h4 className="font-medium mb-1">Meetup Location</h4>
                  <p className="text-sm text-gray-600">
                    {product.location || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Donation Safety Tips (no shadcn) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-700">
                🔒 Donation Safety Tips
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Meet in public campus locations during daylight hours</li>
                <li>• Bring a friend when picking up larger items</li>
                <li>• Test electrical items before taking them</li>
                <li>• Verify donor identity through student email</li>
                <li>• Report suspicious activity to campus security</li>
              </ul>
            </div>

            {/* Public Comments */}
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
