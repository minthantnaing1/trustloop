import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import EditDonationClient from "./EditDonationClient";

export default async function EditDonationPage({ params }) {
  const { id } = await params;

  const session = await auth();
  const sessionEmail = session?.user?.email || "";

  const cookieStore = await cookies();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${id}`,
    {
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    }
  );

  if (!res.ok) return notFound();

  const product = await res.json();

  // ensure it’s a donation
  if (product?.type !== "donation") redirect(`/sell/${id}/edit`);

  const isOwner = sessionEmail === product?.owner?.email;
  if (!isOwner) redirect(`/donation/${id}`);

  // prevent editing if item already given away
  if (product.isAvailable !== true) redirect(`/donation/${id}`);

  return <EditDonationClient initialProduct={product} />;
}
