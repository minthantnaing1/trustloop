// app/auction/[id]/edit/page.js
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import EditAuctionClient from "./EditAuctionClient";

export const dynamic = "force-dynamic";

export default async function EditAuctionPage({ params }) {
  const { id } = await params;

  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  const cookieStore = await cookies();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );

  if (!res.ok) return notFound();

  const product = await res.json();

  // ensure it’s an auction
  if (product?.type !== "auction") {
    // if it’s donation, go donation edit, else go sell edit
    if (product?.type === "donation") redirect(`/donation/${id}/edit`);
    redirect(`/sell/${id}/edit`);
  }

  const isOwner = sessionEmail === product?.owner?.email;
  if (!isOwner) redirect(`/auction/${id}`);

  // prevent editing if locked by transaction (your API already blocks too)
  if (product.isAvailable !== true) redirect(`/auction/${id}`);

  return <EditAuctionClient initialProduct={product} />;
}
