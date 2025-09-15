// app/sell/[id]/edit/page.js
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import EditProductClient from "./EditProductClient";

export default async function EditProductPage({ params }) {
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

  const isOwner = sessionEmail === product?.owner?.email;
  if (!isOwner) redirect(`/buy/${id}`);

  // If you want to block editing when an active transaction exists:
  if (product.isAvailable !== true) redirect(`/sell/${id}`);

  return <EditProductClient initialProduct={product} />;
}
