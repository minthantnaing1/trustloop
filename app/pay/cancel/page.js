import { Suspense } from "react";
import PayCancelClient from "./PayCancelClient";

export default function PayCancelPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PayCancelClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      Cancelling payment…
    </div>
  );
}
