// app/terms/page.js
import { Suspense } from "react";
import TermsClient from "./TermsClient";

export default function TermsPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-white" />}>
      <TermsClient />
    </Suspense>
  );
}
