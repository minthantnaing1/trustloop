"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Image from "next/image";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import ProductDeleteButton from "@/components/ProductDeleteButton";
import ProductImages from "@/components/ProductImages";
import CommentSection from "@/components/CommentSection";
import FavoriteButton from "@/components/FavoriteButton";
import HideToggleButton from "@/components/HideToggleButton";
import BackButton from "@/components/BackButton";
import { PencilIcon } from "@heroicons/react/24/solid";
import MaskedUserId from "@/components/MaskedUserId";
import { fmtBKK } from "@/utils/timeAgo";

export default function DonationDetails({
  product,
  sessionEmail,
  initialIsFav,
  isOwner,
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  const isAvailable = product.isAvailable === true;
  const isSelective = product.donationMode === "selective";
  const isInstant = product.donationMode === "instant";
  const hasPendingMyRequest = Boolean(product.viewerHasPendingRequest);

  // Only non-owners of available item can interact — and for selective,
  // they must NOT already have a pending request.
  const canReceiverRequest =
    !isOwner &&
    isAvailable &&
    ((isInstant && true) || (isSelective && !hasPendingMyRequest));

  const canDonatorManage = isOwner && isAvailable;

  async function decide(requestId, action) {
    if (!requestId || !["accept", "reject"].includes(action)) return;
    const confirmTxt =
      action === "accept"
        ? "Accept this requester? This will move forward to the handover flow."
        : "Reject this request?";
    if (!window.confirm(confirmTxt)) return;

    try {
      setBusyId(requestId);
      // Adjust these endpoints to your API when you wire them up.
      const res = await fetch(`/api/donations/request/${requestId}/${action}`, {
        method: "POST",
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(txt || `Failed to ${action} request.`);
      } else {
        router.refresh();
      }
    } catch {
      alert(`Error while trying to ${action} the request.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        {/* --- Top Section --- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-2">
          <BackButton />
          {isOwner && canDonatorManage && (
            <div className="flex gap-2 sm:gap-3 items-center w-full sm:w-auto self-end sm:self-auto sm:ml-auto justify-end flex-wrap">
              <HideToggleButton
                productId={product._id}
                initialHidden={product.isHidden}
              />
              <Link href={`/donation/${product._id}/edit`}>
                <ActionButton
                  text="Edit"
                  variant="outlineHover"
                  icon={<PencilIcon className="w-4.5 h-4.5" />}
                />
              </Link>
              <ProductDeleteButton productId={product._id} type="donation" />
            </div>
          )}
        </div>

        {/* --- Main Content --- */}
        <div className="flex gap-[30px] flex-col sm:flex-row">
          {/* LEFT: keep ProductImages sizing exactly as before; just add requests below it */}
          <div className="flex flex-col gap-3">
            <ProductImages
              images={product.images}
              defaultImage={product.defaultImage}
            />

            {/* Requests moved BELOW the image (owner only) */}
            {isOwner && (
              <div className="bg-[#fafafa] border border-gray-300 p-3 rounded-md">
                <h3 className="font-semibold text-[#325082] mb-2">
                  Requests Received
                </h3>
                {product.requests?.length ? (
                  <ul className="space-y-3">
                    {product.requests.map((r) => (
                      <li
                        key={r._id}
                        className="flex items-start gap-3 p-2 rounded border border-gray-200 bg-white"
                      >
                        <Image
                          src={r.user?.image || "/default-profile.png"}
                          alt="Requester image"
                          width={44}
                          height={44}
                          className="rounded-full object-cover border-2 border-[#325082] w-[44px] h-[44px]"
                        />

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="font-semibold text-[#1f2f4c]">
                              {r.user?.name || r.user?.email || "Unknown User"}
                            </span>
                            <span className="text-[13px] text-[#555]">
                              <MaskedUserId
                                email={r.user?.email}
                                reveal={false}
                              />
                            </span>
                          </div>

                          {r.message && (
                            <p className="text-sm text-gray-700 italic mt-0.5">
                              “{r.message}”
                            </p>
                          )}

                          <p className="text-[11px] text-gray-500 mt-1">
                            {r.createdAt ? fmtBKK(r.createdAt) : ""}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <ActionButton
                            text="Accept"
                            variant="primaryClick"
                            onClick={() => decide(r._id, "accept")}
                            disabled={busyId === r._id}
                          />
                          <ActionButton
                            text="Reject"
                            variant="dangerOutlineHover"
                            onClick={() => decide(r._id, "reject")}
                            disabled={busyId === r._id}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No one has requested this item yet.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Donation Info (unchanged layout/sizing) */}
          <div className="flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <p className="text-m text-gray-700">Category: {product.category}</p>

            <p className="text-lg font-semibold text-[#325082]">Free</p>

            <div className="flex items-center gap-2 flex-wrap">
              {product.donationMode && (
                <span className="bg-[#325082] text-white text-xs font-medium px-2 py-1 rounded">
                  {product.donationMode === "instant"
                    ? "Instant Donation"
                    : "Selective Donation"}
                </span>
              )}
              {product.requestDeadline && (
                <span className="text-[12px] font-medium text-[#b91c1c] bg-white/90 px-2 py-1 rounded border border-[#fca5a5]">
                  Deadline: {fmtBKK(product.requestDeadline)}
                </span>
              )}
            </div>

            {/* Receiver Buttons / State */}
            <div className="flex flex-wrap justify-center gap-2 w-full h-full">
              {!isOwner && isSelective && hasPendingMyRequest && (
                <div className="w-full text-center text-xs sm:text-sm px-3 py-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                  You&apos;ve already requested this item. Please wait for the
                  donor&apos;s decision.
                </div>
              )}

              {canReceiverRequest && (
                <>
                  <Link
                    href={`/donation/${product._id}/request`}
                    className="flex-5 sm:flex-9"
                  >
                    <ActionButton
                      text={
                        isInstant ? "🎁 Get this Item" : "✍️ Request this Item"
                      }
                      variant="buyPrimaryClick"
                      className="w-full"
                    />
                  </Link>

                  <div className="flex-1">
                    <FavoriteButton
                      productId={product._id?.toString()}
                      initialIsFav={Boolean(initialIsFav)}
                      className="w-full h-full"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description: {product.description || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Condition: {product.condition || "-"}
            </div>
            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Product Location: {product.owner?.location || "-"}
            </div>

            <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <Link href={`/profile/${product.owner?._id}`}>
                <Image
                  src={product.owner?.image || "/default-profile.png"}
                  alt="Donator Image"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-[#325082] w-[60px] h-[60px] transition-transform duration-500 hover:scale-105"
                />
              </Link>
              <div className="flex flex-col">
                <h3 className="font-normal">Donator:</h3>
                <p className="font-semibold text-[#222]">
                  {product.owner?.name}
                </p>
                <p className="text-[14px] text-[#555]">
                  <MaskedUserId email={product.owner?.email} reveal={isOwner} />
                </p>
              </div>
            </div>

            <CommentSection
              productId={product._id.toString()}
              initialComments={product.comments || []}
              userEmail={sessionEmail}
              productOwnerEmail={product.owner?.email}
            />
          </div>
        </div>
      </main>
    </>
  );
}
