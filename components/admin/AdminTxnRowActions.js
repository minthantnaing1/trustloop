"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ActionButton from "@/components/ActionButton";

export default function AdminTxnRowActions({ txnId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function call(op, extra = {}) {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/transactions/${txnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...extra }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <ActionButton
        text="Verify"
        variant="primaryClick"
        onClick={() => call("verify")}
        disabled={busy}
        className="h-[34px] w-[90px]"
      />
      <ActionButton
        text="Reject"
        variant="dangerHover"
        onClick={() => {
          const reason = prompt("Reason for rejection? (shown in timeline)");
          if (reason !== null) call("reject", { reason });
        }}
        disabled={busy}
        className="h-[34px] w-[90px]"
      />
      {err ? <span className="text-[11px] text-red-600">{err}</span> : null}
    </div>
  );
}
