// app/buy/[id]/page.js
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ProductDetails from "@/components/ProductDetails";
import BackButton from "@/components/BackButton";
import ActionButton from "@/components/ActionButton";

export default async function BuyProductPage({ params }) {
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
    return (
      <>
        <NavBar />
        <main className="max-w-[1200px] mx-auto px-4">
          {/* center the card within the viewport area */}
          <div className="min-h-[calc(100vh-210px)] flex items-center justify-center">
            <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
              <div className="text-4xl mb-2">🔒</div>
              <h1 className="text-xl font-semibold text-[#1f2d4d]">
                This Product isn&apos;t available!
              </h1>
              <p className="mt-1 text-slate-600">
                This item may have been reserved, removed, or hidden by the
                seller. If it&apos;s in your favorites, it will stay there, but
                you won&apos;t be able to open it unless you remove it from
                favorites or leave it as is.
              </p>

              <div className="mt-5 flex justify-between">
                <BackButton text="Go back" />
                <Link href="/buy">
                  <ActionButton
                    text="Browse other items"
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
  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  await connectDB();

  let initialIsFav = false;
  if (session?.user?.email) {
    const me = await User.findOne({ email: session.user.email })
      .select("favorites")
      .lean();

    initialIsFav = !!me?.favorites?.some(
      (fid) => String(fid) === String(product._id)
    );
  }

  const isOwner = sessionEmail === product.owner?.email;

  return (
    <ProductDetails
      product={product}
      sessionEmail={sessionEmail}
      initialIsFav={initialIsFav}
      isOwner={isOwner}
    />
  );
}
