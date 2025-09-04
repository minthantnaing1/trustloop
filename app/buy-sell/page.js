// SERVER component
import { cookies } from "next/headers";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

export default async function BuySellPage() {
  const cookieStore = await cookies();

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  const initial = res.ok
    ? await res.json() // { products, userEmail }
    : { products: [], userEmail: "" };

  return <ProductsClient initial={initial} />;
}
