// components/DonationDetails.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import ProductDeleteButton from "@/components/ProductDeleteButton";
import ProductImages from "@/components/ProductImages";
import CommentSection from "@/components/CommentSection";
import FavoriteButton from "@/components/FavoriteButton";
import HideToggleButton from "@/components/HideToggleButton";
import BackButton from "@/components/BackButton";
import Stepper from "@/components/Stepper";
import { PencilIcon } from "@heroicons/react/24/solid";
import MaskedUserId from "@/components/MaskedUserId";
import { fmtBKK } from "@/utils/timeAgo";
import BuyRequestGuard from "@/components/BuyRequestGuard";

export default function DonationDetails({
  product,
  sessionEmail,
  initialIsFav,
  isOwner,
  guard,
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  const isAvailable = product.isAvailable === true;
  const isSelective = product.donationMode === "selective";
  const isInstant = product.donationMode === "instant";
  const hasPendingMyRequest = Boolean(product.viewerHasPendingRequest);

  const deadlinePassed =
    product?.donationMode === "selective" &&
    product?.requestDeadline &&
    new Date(product.requestDeadline) <= new Date();

  // Only non-owners of available item can interact — and for selective,
  // they must NOT already have a pending request.
  const canReceiverRequest =
    !isOwner &&
    isAvailable &&
    !deadlinePassed &&
    ((isInstant && true) || (isSelective && !hasPendingMyRequest));

  const canDonatorManage = isOwner && isAvailable;

  const anyAccepted = product.requests?.some((r) => r.status === "accepted");

  async function decide(requestId, action) {
    if (!requestId || !["accept", "reject"].includes(action)) return;
    const confirmTxt =
      action === "accept"
        ? "Accept this requester? This will move forward to the handover flow."
        : "Reject this request?";
    if (!window.confirm(confirmTxt)) return;

    try {
      setBusyId(requestId);

      const res = await fetch(`/api/donations/request/${requestId}/${action}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const txt = await res.text();
        alert(txt || `Failed to ${action} request.`);
        return;
      }

      // Optional JSON { orderId }
      if (action === "accept") {
        let orderId = "";
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          try {
            const data = await res.json();
            orderId = data?.orderId || "";
          } catch {}
        }

        // redirect to my-orders doner view
        router.push(`/my-orders?role=seller&status=ALL&kind=DONATION`);
        return;
      }

      // After reject, just refresh
      router.refresh();
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

        {/* For Donor view (owner) */}
        {isOwner && isSelective && (
          <div className="mb-5">
            <Stepper current={2} variant="donor" className="px-1" />
          </div>
        )}

        {/* --- Main Content --- */}
        <div className="flex gap-[30px] flex-col sm:flex-row">
          {/* LEFT: images + requests, tight spacing */}
          <div className="flex flex-col gap-3 w-full sm:w-[520px] lg:w-[560px] flex-none">
            <div className="mb-1">
              <ProductImages
                images={product.images}
                defaultImage={product.defaultImage}
              />
            </div>

            {/* Owner view (selective only): requests right under image */}
            {isOwner && isSelective && (
              <div className="bg-[#fafafa] border border-gray-300 rounded-md">
                <div className="px-3 pt-3">
                  <h3 className="font-semibold text-[#325082]">
                    Requests Received
                  </h3>
                </div>

                {/* Scroll region */}
                <div className="mt-2 px-3 pb-3 sm:max-h-[190px] overflow-y-auto">
                  {product.requests?.length ? (
                    <ul className="space-y-3">
                      {product.requests.map((r) => (
                        <li
                          key={r._id}
                          className="flex items-start gap-3 p-2 rounded border border-gray-200 bg-white"
                        >
                          <img
                            src={r.user?.image || "/default-profile.png"}
                            alt="Requester image"
                            width={44}
                            height={44}
                            className="rounded-full object-cover border-2 border-[#325082] w-[44px] h-[44px]"
                            onError={(e) => {
                              e.currentTarget.src = "/default-profile.png";
                            }}
                          />

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-x-2">
                              <span className="font-semibold text-[#1f2f4c]">
                                {r.user?.name ||
                                  r.user?.email ||
                                  "Unknown User"}
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

                          {/* No "Pending" badge for owner; buttons only while pending */}
                          {isAvailable && r.status === "pending" ? (
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
                          ) : (
                            <div className="flex flex-col text-xs font-medium text-center mt-1">
                              {r.status === "accepted" && (
                                <span className="text-green-600">
                                  ✅ Accepted
                                </span>
                              )}
                              {r.status === "rejected" && (
                                <span className="text-red-500">
                                  ❌ Rejected
                                </span>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No one has requested this item yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Viewer’s own request summary (selective only), scrollable */}
            {!isOwner && isSelective && product.viewerRequests?.length > 0 && (
              <div className="bg-[#fafafa] border border-gray-300 rounded-md">
                <div className="px-3 pt-3">
                  <h3 className="font-semibold text-[#325082]">Your Request</h3>
                </div>

                <div className="mt-2 px-3 pb-3 sm:max-h-[228px] overflow-y-auto">
                  <ul className="space-y-3">
                    {product.viewerRequests.map((r) => (
                      <li
                        key={r._id}
                        className="flex items-start gap-3 p-2 rounded border border-gray-200 bg-white"
                      >
                        <img
                          src={r.user?.image || "/default-profile.png"}
                          alt="Your image"
                          width={44}
                          height={44}
                          className="rounded-full object-cover border-2 border-[#325082] w-[44px] h-[44px]"
                          onError={(e) => {
                            e.currentTarget.src = "/default-profile.png";
                          }}
                        />
                        <div className="flex-1">
                          {r.message && (
                            <p className="text-sm text-gray-700 italic mt-0.5">
                              “{r.message}”
                            </p>
                          )}
                          <p className="text-[11px] text-gray-500 mt-1">
                            {r.createdAt ? fmtBKK(r.createdAt) : ""}
                          </p>
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {r.status === "pending" && (
                            <span className="text-yellow-600">⏳ Pending</span>
                          )}
                          {r.status === "accepted" && (
                            <span className="text-green-600">✅ Accepted</span>
                          )}
                          {r.status === "rejected" && (
                            <span className="text-red-600">❌ Rejected</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Donation Info (unchanged layout/sizing) */}
          <div className="min-w-0 flex-1 flex flex-col gap-3">
            <h2 className="text-xl font-bold text-[#325082]">
              {product.title}
            </h2>
            <div className="text-gray-700">
              Category:{" "}
              <span className="font-semibold">{product.category || "-"}</span>
            </div>
            <p className="text-lg font-semibold text-[#325082]">Free</p>

            <div className="flex items-center gap-2 flex-wrap">
              {product.donationMode && (
                <span
                  title={
                    product.donationMode === "instant"
                      ? "Anyone can request the item immediately on a first-come basis."
                      : "The donor reviews all requests and selects a recipient before the deadline."
                  }
                  className="bg-[#325082] text-white text-[12px] font-medium px-2 py-1 rounded border border-[#325082] cursor-help"
                >
                  {product.donationMode === "instant"
                    ? "Instant Donation (First come first serve)"
                    : "Selective Donation (Chosen by donor)"}
                </span>
              )}

              {product.requestDeadline && (
                <span className="text-[12px] font-medium text-[#b91c1c] bg-white/90 px-2 py-1 rounded border border-[#fca5a5]">
                  Deadline: {fmtBKK(product.requestDeadline)}
                </span>
              )}
            </div>

            {/* Receiver Buttons / State */}
            {!isOwner && (
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {isSelective && hasPendingMyRequest && !deadlinePassed && (
                  <div className="w-full text-center text-xs sm:text-sm px-3 py-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                    You&apos;ve already requested this item. Please wait for the
                    donor&apos;s decision.
                  </div>
                )}

                {/* After deadline hits, disable interactions and show info */}
                {deadlinePassed && (
                  <div className="w-full text-center text-xs sm:text-sm px-3 py-2 rounded bg-red-50 border border-red-200 text-red-700">
                    ⏰ You cannot request this item anymore — the request
                    deadline has passed.
                  </div>
                )}

                {canReceiverRequest && (
                  <>
                    <div className="flex-5 sm:flex-9">
                      <BuyRequestGuard
                        href={`/donation/${product._id}/request`}
                        guard={guard}
                        text={
                          isInstant
                            ? "🎁 Get this Item"
                            : "✍️ Request this Item"
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <FavoriteButton
                        productId={product._id?.toString()}
                        initialIsFav={Boolean(product.isFav ?? initialIsFav)}
                        className="w-full h-full"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Description:{" "}
              <span className="font-semibold">
                {product.description || "-"}
              </span>
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Condition:{" "}
              <span className="font-semibold">{product.condition || "-"}</span>
            </div>

            <div className="bg-[#e2e2e2] p-3 rounded-md">
              Product Location:{" "}
              <span className="font-semibold">{product.location || "-"}</span>
            </div>

            <div className="flex items-center gap-4 mt-3 p-3 rounded-md bg-[#f0f0f0] border border-[#ccc]">
              <Link href={`/profile/${product.owner?._id}`}>
                <img
                  src={product.owner?.image || "/default-profile.png"}
                  alt="Donator Image"
                  width={60}
                  height={60}
                  className="rounded-full object-cover border-2 border-[#325082] w-[60px] h-[60px] transition-transform duration-500 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/default-profile.png";
                  }}
                />
              </Link>
              <div className="flex flex-col">
                <h3 className="font-semibold">
                  {isOwner ? "Donor (Me):" : "Donor:"}
                </h3>
                <p className="font-semibold text-[#222]">
                  {product.owner?.name}
                </p>
                <p className="text-[14px] text-[#222]">
                  <MaskedUserId email={product.owner?.email} reveal={isOwner} />
                </p>
              </div>
            </div>

            <CommentSection
              productId={product._id.toString()}
              initialComments={product.comments || []}
              userEmail={sessionEmail}
              productOwnerEmail={product.owner?.email}
              isAvailable={product.isAvailable}
            />
          </div>
        </div>
      </main>
    </>
  );
}
