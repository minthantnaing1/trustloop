import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import NavBar from "@/components/NavBar";
import DonationDetails from "@/components/DonationDetails";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";

export default async function DonationProductPage({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  // 404 or not found
  if (!res.ok) {
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-3">
          <div className="min-h-[calc(100vh-210px)] flex items-center justify-center">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">🎁</div>
              <h1 className="text-xl font-semibold text-[#1f2d4d]">
                This Donation isn&apos;t available!
              </h1>
              <p className="mt-1 text-slate-600">
                It might have been already donated or hidden by the owner. You
                can browse other available donations below.
              </p>

              <div className="mt-5 flex justify-between">
                <BackButton text="Go back" />
                <Link href="/donation">
                  <ActionButton
                    text="Browse Donations"
                    variant="primaryClick"
                  />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const product = await res.json();

  // 🚨 Redirect if type mismatch
  if (product.type && product.type !== "donation") {
    return redirect(`/${product.type}/${product._id}`);
  }

  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  await connectDB();

  let initialIsFav = false;
  if (sessionEmail) {
    const me = await User.findOne({ email: sessionEmail })
      .select("favorites")
      .lean();

    initialIsFav = !!me?.favorites?.some(
      (fid) => String(fid) === String(product._id)
    );
  }

  const isOwner = sessionEmail === product.owner?.email;

  return (
    <DonationDetails
      product={product}
      sessionEmail={sessionEmail}
      initialIsFav={initialIsFav}
      isOwner={isOwner}
    />
  );
}
