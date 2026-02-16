import { Suspense } from "react";
import NavBar from "@/components/NavBar";
import SupportReportClient from "./SupportReportClient";

export default function SupportNewPage() {
  return (
    <>
      <NavBar />
      <Suspense fallback={<div className="p-4 text-slate-500">Loading…</div>}>
        <SupportReportClient mode="new" />
      </Suspense>
    </>
  );
}
