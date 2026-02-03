"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ActionButton from "@/components/ActionButton";

function PriorityTagPreview({ value }) {
  const v = String(value || "MEDIUM").toUpperCase();
  const tone =
    v === "URGENT"
      ? "ring-red-200/70 bg-red-50/70 text-red-700"
      : v === "HIGH"
        ? "ring-amber-200/70 bg-amber-50/70 text-amber-700"
        : v === "LOW"
          ? "ring-slate-200/70 bg-slate-50/70 text-slate-600"
          : "ring-sky-200/70 bg-sky-50/70 text-sky-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
    >
      {v}
    </span>
  );
}

export default function SupportReportClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const defaultCategory = sp.get("category") || "OTHER";
  const defaultPriority = sp.get("priority") || "MEDIUM";
  const preTxnId = sp.get("transactionId") || "";

  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState(defaultPriority);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [myTxns, setMyTxns] = useState([]);
  const [selectedTxnId, setSelectedTxnId] = useState(preTxnId);

  const [txn, setTxn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // ✅ You need an endpoint that returns "my orders" list.
  // If you ALREADY have a route, replace this URL with it.
  // I’m assuming: /api/transactions/mine (common).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/transactions/mine", { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        const list = Array.isArray(data) ? data : data?.transactions || [];
        if (mounted) setMyTxns(list);
      } catch {
        // not fatal
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedTxnId) {
      setTxn(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/transactions/${selectedTxnId}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (mounted) setTxn(data);
      } catch (e) {
        if (mounted) {
          setTxn(null);
          setErr(e.message || "Failed to load order");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedTxnId]);

  const contextLine = useMemo(() => {
    if (!txn) return null;
    return {
      productTitle: txn.product?.title || "-",
      buyer: txn.buyer?.name || txn.buyer?.email || "-",
      seller: txn.seller?.name || txn.seller?.email || "-",
      status: txn.status || "-",
    };
  }, [txn]);

  async function submit() {
    try {
      setBusy(true);
      setErr("");

      const cleanDesc = description.trim();
      const cleanSubject =
        subject.trim() ||
        (category ? String(category).replaceAll("_", " ") : "Support Ticket");

      const payload = {
        category,
        priority,
        subject: cleanSubject,
        description: cleanDesc,
        transactionId: selectedTxnId || undefined, // ✅ KEY FIX
      };

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      router.push("/support");
    } catch (e) {
      setErr(e.message || "Failed to submit report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-[1200px] mx-auto px-3 mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#325082]">
            Customer Support
          </h1>
          <div className="text-xl font-bold text-[#325082]">/ New Report</div>
        </div>

        <Link href="/support">
          <ActionButton text="Back" variant="outlineClick" />
        </Link>
      </div>

      {err && <p className="mb-3 text-sm text-red-600">{String(err)}</p>}

      {/* ✅ Optional transaction selector */}
      <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5 mb-4">
        <div className="text-[15px] font-semibold text-[#325082]">
          Related Order (optional)
        </div>
        <div className="text-[12px] text-slate-500 mt-1">
          Pick an order so TrustLoop can attach the correct product &
          transaction.
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-[#1f2f4c]">
            Select my order
          </label>
          <select
            className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white"
            value={selectedTxnId}
            onChange={(e) => setSelectedTxnId(e.target.value)}
          >
            <option value="">No order (general report)</option>
            {myTxns.map((t) => {
              const tid = String(t._id);
              const title = t.product?.title || "Order";
              const status = t.status || "";
              return (
                <option key={tid} value={tid}>
                  {title} — {status} ({tid.slice(-6)})
                </option>
              );
            })}
          </select>
        </div>
      </section>

      {/* ✅ Preview */}
      {contextLine && (
        <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5 mb-4">
          <div className="text-[15px] font-semibold text-[#325082]">
            Auto-filled order information
          </div>

          <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
            <div>
              <span className="text-slate-500">Product:</span>{" "}
              <span className="font-semibold text-[#1f2f4c]">
                {contextLine.productTitle}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Order status:</span>{" "}
              <span className="font-semibold">{contextLine.status}</span>
            </div>
            <div>
              <span className="text-slate-500">Buyer:</span>{" "}
              <span className="font-semibold">{contextLine.buyer}</span>
            </div>
            <div>
              <span className="text-slate-500">Seller:</span>{" "}
              <span className="font-semibold">{contextLine.seller}</span>
            </div>
          </div>
        </section>
      )}

      {/* Form */}
      <section className="bg-white p-5 rounded-xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-semibold text-[#325082]">
            Report details
          </div>
          <PriorityTagPreview value={priority} />
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[#1f2f4c]">
              Issue type
            </label>
            <select
              className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="DELIVERY_DELAY">Delivery delay</option>
              <option value="WRONG_ITEM">Wrong / damaged item</option>
              <option value="PAYMENT_ISSUE">Payment issue</option>
              <option value="SELLER_NO_SHOW">Seller no-show</option>
              <option value="BUYER_NO_SHOW">Buyer no-show</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#1f2f4c]">
              Priority
            </label>
            <select
              className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-[#1f2f4c]">Subject</label>
          <input
            className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm"
            placeholder="Example: Seller didn't show up for meetup"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-[#1f2f4c]">
            Description
          </label>
          <textarea
            rows={5}
            className="w-full mt-1 border border-slate-200 rounded-md p-3 text-sm"
            placeholder="Explain what happened, include time/date, chat attempts, and what you want TrustLoop to do."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Link href="/support">
            <ActionButton text="Cancel" variant="outlineHover" />
          </Link>

          <ActionButton
            text={busy ? "Submitting..." : "Submit Report"}
            variant="primaryClick"
            disabled={busy || !description.trim()}
            onClick={submit}
          />
        </div>
      </section>
    </main>
  );
}
