// app/donation/[id]/request/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import Stepper from "@/components/Stepper";
import ConfirmDonationRequestButton from "./ConfirmDonationRequestButton";
import { connectDB } from "@/lib/db"; // ← add
import User from "@/models/User";

export const dynamic = "force-dynamic";

export default async function DonationRequestPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  // fetch product
  const prodRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    { headers: { Cookie: cookieStore.toString() }, cache: "no-store" }
  );
  if (!prodRes.ok) return redirect(`/donation/${id}`);
  const product = await prodRes.json();

  // guards
  if (product.type !== "donation") return redirect(`/buy/${id}`);
  if (product.owner?.email === sessionEmail) return redirect(`/donation/${id}`);
  if (product.isAvailable === false) return redirect(`/donation/${id}`);

  // optional: block expired selective
  if (
    product.donationMode === "selective" &&
    product.requestDeadline &&
    new Date(product.requestDeadline) < new Date()
  ) {
    return redirect(`/donation/${id}`);
  }

  // ✅ Require Phone + Location if user is logged in
  if (sessionEmail) {
    await connectDB();
    const me = await User.findOne({ email: sessionEmail })
      .select("phone location")
      .lean();

    if (!me?.phone || !me?.location) {
      return redirect(`/donation/${id}`); // product page button will trigger the modal
    }
  }

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-[40px] px-3 w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">
            Request this Item
          </h1>
          <BackButton />
        </div>

        <div className="mb-5">
          <Stepper current={1} variant="recipient" className="px-1" />
        </div>

        <div className="bg-white border border-gray-300 rounded-[5px] shadow-xl p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: product snapshot */}
            <div className="flex-1">
              <div className="flex gap-4">
                <img
                  src={
                    product.defaultImage ||
                    product.images?.[0] ||
                    "/placeholder.png"
                  }
                  alt={product.title}
                  className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] rounded-[5px] object-cover border border-gray-300 shadow-sm"
                />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#1f2f4c]">
                    {product.title}
                  </h2>
                  <p className="mt-1 text-[#325082] font-semibold">Free</p>

                  <div className="mt-2 text-[14px] text-gray-600 space-y-1">
                    <div>
                      Donor:{" "}
                      <span className="font-semibold text-[#1f2f4c]">
                        {product.owner?.name || "-"}
                      </span>
                    </div>
                    <div>
                      Category:{" "}
                      <span className="font-semibold">{product.category}</span>
                    </div>
                    <div>
                      Condition:{" "}
                      <span className="font-semibold">{product.condition}</span>
                    </div>
                    <div>
                      Meetup Location:{" "}
                      <span className="font-semibold">{product.location}</span>
                    </div>
                    {product.donationMode === "selective" &&
                      product.requestDeadline && (
                        <div className="text-rose-700">
                          Deadline:&nbsp;
                          <span className="font-semibold">
                            {new Intl.DateTimeFormat("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              hour12: true,
                              timeZone: "Asia/Bangkok",
                            }).format(new Date(product.requestDeadline))}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#325082] mb-2">
                  What happens next
                </h3>
                {product.donationMode === "instant" ? (
                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                    <li>
                      Your request is submitted immediately and the item is
                      reserved for you.
                    </li>
                    <li>
                      An order is opened (no payment). You and donor can arrange
                      meetup in the order page.
                    </li>
                  </ul>
                ) : (
                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                    <li>
                      Your request is sent to the donor. No order is created
                      yet.
                    </li>
                    <li>
                      If the donor accepts you, the item will be reserved and an
                      order will open (no payment).
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {/* Right: reason + confirm */}
            <div className="w-full lg:w-[460px]">
              <div className="rounded-[5px] border border-gray-300 shadow-md overflow-hidden">
                <div className="p-4 bg-gradient-to-br from-[#f3f6fb] to-white">
                  <h3 className="font-semibold text-[#325082]">
                    Submit Your Request
                  </h3>
                </div>

                <form id="donationRequestForm" className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#325082] mb-1">
                      Why do you want this item? *
                    </label>
                    <textarea
                      name="reason"
                      required
                      minLength={10}
                      maxLength={1000}
                      placeholder="Short reason that helps the donor understand your need..."
                      className="w-full rounded-[5px] border border-[#dbe6ff] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#325082]/30 min-h-[120px]"
                    />
                    <p className="text-xs text-gray-600 ml-1 mt-1">
                      Be specific and polite. This message is visible to the
                      donor.
                    </p>
                  </div>

                  <div className="mt-2">
                    {session ? (
                      <ConfirmDonationRequestButton
                        productId={product._id}
                        donationMode={product.donationMode}
                        formId="donationRequestForm"
                      />
                    ) : (
                      <div className="block text-center bg-gray-300 text-gray-600 px-4 py-2 rounded-md cursor-not-allowed">
                        Sign in to continue
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-center text-gray-600 -mt-1 leading-relaxed">
                    By submitting, you agree to contact the donor only for
                    arranging a fair pickup/meetup. No money is involved.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
