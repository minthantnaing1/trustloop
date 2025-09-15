// app/sell/[id]/page.js
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ProductDetails from "@/components/ProductDetails";

export default async function SellProductPage({ params }) {
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

  if (!isOwner) {
    // non-owner should never see the sell detail page
    redirect(`/buy/${id}`);
  }

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

  return (
    <ProductDetails
      product={product}
      sessionEmail={sessionEmail}
      initialIsFav={initialIsFav}
      isOwner={true}
    />
  );
}
