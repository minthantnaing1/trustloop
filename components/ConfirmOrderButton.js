"use client";

import { useRef, useState } from "react";
import ActionButton from "@/components/ActionButton";
import { useRouter } from "next/navigation";

export default function ConfirmOrderButton({ productId, formId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  const ranRef = useRef(false);

  function writeLoadingPage(win) {
    if (!win || win.closed) return;

    // Write instantly so user doesn't see blank white screen
    try {
      win.document.open();
      win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Opening payment…</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
      display:flex;align-items:center;justify-content:center;height:100vh;background:white;}
    .card{width:min(440px,92vw);background:#fff;border:1px solid #dbe6ff;
      box-shadow:0 10px 30px rgba(0,0,0,.18);padding:18px 18px 14px}
    .title{font-weight:800;color:#325082;font-size:20px;margin:0 0 6px}
    .sub{margin:0 0 14px;color:#334155;font-size:14px}
    .bar{height:10px;background:#e9eff7;border:1px solid #cdd9ef;border-radius:999px;overflow:hidden}
    .bar > i{display:block;height:100%;width:40%;background:#325082;border-radius:999px;
      animation:move 1.1s infinite ease-in-out}
    @keyframes move{0%{transform:translateX(-110%)} 100%{transform:translateX(260%)}}
    .small{margin:12px 0 0;color:#64748b;font-size:12px}
  </style>
</head>
<body>
  <div class="card">
    <p class="title">Opening Stripe Checkout…</p>
    <p class="sub">Please don’t close this tab.</p>
    <div class="bar"><i></i></div>
    <p class="small">If nothing happens, allow popups for TrustLoop.</p>
  </div>
</body>
</html>`);
      win.document.close();
    } catch {
      // ignore
    }
  }

  async function handleConfirm(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (loading || ranRef.current) return;
    ranRef.current = true;

    // ✅ Open new tab immediately
    const payTab = window.open("about:blank", "_blank");
    if (payTab) {
      payTab.opener = null;
      writeLoadingPage(payTab); // ✅ no more blank white screen
    }

    try {
      setLoading(true);
      setErr("");

      if (!productId) throw new Error("Missing productId");

      let payload = { productId };

      if (formId) {
        const form = document.getElementById(formId);
        if (!form) throw new Error("Checkout form not found");

        const fd = new FormData(form);
        const location = (fd.get("location") || "").toString().trim();
        if (!location)
          throw new Error("Please provide a location for this order.");

        payload = { ...payload, buyerLocation: location };
      }

      // 1) Create transaction
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to create transaction");
      const { transactionId } = await res.json();

      // 2) Create Stripe Checkout session
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      if (!checkoutRes.ok)
        throw new Error(
          (await checkoutRes.text()) || "Failed to start payment",
        );
      const { url } = await checkoutRes.json();
      if (!url) throw new Error("Missing payment URL");

      // 3) Navigate new tab to Stripe first (priority)
      if (payTab && !payTab.closed) {
        payTab.location.href = url;
      } else {
        // popup blocked → fallback to same tab
        window.location.href = url;
        return;
      }

      // 4) Redirect current tab AFTER (tiny delay so Stripe starts loading)
      setTimeout(() => {
        router.replace("/my-orders");
      }, 250);
    } catch (error) {
      if (payTab && !payTab.closed) payTab.close();

      ranRef.current = false;
      setLoading(false);
      setErr(error?.message || "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ActionButton
        text={loading ? "Redirecting to payment..." : "Confirm Order & Pay"}
        variant="confirmPrimaryHover"
        onClick={handleConfirm}
        disabled={loading}
      />
      {err ? <span className="text-xs text-red-600">{err}</span> : null}
    </div>
  );
}
