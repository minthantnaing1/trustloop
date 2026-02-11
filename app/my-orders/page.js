import { Suspense } from "react";
import NavBar from "@/components/NavBar";
import MyOrdersClient from "./MyOrdersClient";

export default function MyOrdersPage() {
  return (
    <>
      <NavBar />
      <Suspense fallback={<div className="p-4 text-slate-500">Loading…</div>}>
        <MyOrdersClient />
      </Suspense>
    </>
  );
}
