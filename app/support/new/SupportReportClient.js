"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import BackButton from "@/components/BackButton";

function categoryLabel(cat) {
  const map = {
    SELLER_NO_SHOW: "Seller no-show / not responding",
    BUYER_NO_SHOW: "Buyer no-show",
    DELIVERY_DELAY: "Delivery delay",
    WRONG_ITEM: "Wrong / damaged item",
    PAYMENT_ISSUE: "Payment issue",
    OTHER: "Other",
  };
  return map[cat] || "Support ticket";
}

function priorityForCategory(cat) {
  const map = {
    PAYMENT_ISSUE: "URGENT",
    WRONG_ITEM: "HIGH",
    SELLER_NO_SHOW: "HIGH",
    BUYER_NO_SHOW: "MEDIUM",
    DELIVERY_DELAY: "MEDIUM",
    OTHER: "LOW",
  };
  return map[cat] || "MEDIUM";
}

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
  const preTxnId = sp.get("transactionId") || "";
  const preAs = (sp.get("as") || "").toLowerCase(); // "buyer" | "seller"

  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");

  // GENERAL | BUY_SELL | DONATION | AUCTION
  const [kind, setKind] = useState(preTxnId ? "BUY_SELL" : "GENERAL");
  const [role, setRole] = useState(preAs === "seller" ? "seller" : "buyer");
  const [myTxns, setMyTxns] = useState([]);
  const [selectedTxnId, setSelectedTxnId] = useState(preTxnId);

  const [txn, setTxn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const computedPriority = priorityForCategory(category);
  const isGeneral = kind === "GENERAL";

  useEffect(() => {
    if (preAs === "seller") setRole("seller");
    else if (preAs === "buyer") setRole("buyer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preAs]);

  useEffect(() => {
    if (preTxnId) {
      const applyDeepLink = async () => {
        try {
          const r = await fetch(`/api/transactions/${preTxnId}`, {
            cache: "no-store",
          });
          if (!r.ok) return;
          const data = await r.json();
          const k = String(data?.kind || "BUY_SELL").toUpperCase();
          setKind(
            k === "DONATION"
              ? "DONATION"
              : k === "AUCTION"
                ? "AUCTION"
                : "BUY_SELL",
          );
        } catch {}
      };
      applyDeepLink();
    }
  }, [preTxnId]);

  useEffect(() => {
    if (!preTxnId && !isGeneral) setSelectedTxnId("");
    if (isGeneral) {
      setSelectedTxnId("");
      setTxn(null);
      setMyTxns([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, role]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setErr("");

        if (isGeneral) {
          if (mounted) setMyTxns([]);
          return;
        }

        setMyTxns([]);

        const url =
          role === "seller"
            ? "/api/transactions/mine?role=seller"
            : "/api/transactions/mine?role=buyer";

        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        const list = Array.isArray(data) ? data : data?.transactions || [];
        const filtered = list.filter(
          (t) => String(t?.kind || "").toUpperCase() === kind,
        );

        if (mounted) setMyTxns(filtered);
      } catch (e) {
        if (mounted) setErr(e?.message || "Failed to load your transactions");
      }
    })();

    return () => {
      mounted = false;
    };
  }, [role, kind, isGeneral]);

  useEffect(() => {
    if (isGeneral || !selectedTxnId) {
      setTxn(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setErr("");
        const r = await fetch(`/api/transactions/${selectedTxnId}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();

        if (mounted) {
          setTxn(data);

          if (!preAs) {
            const meRes = await fetch(`/api/users/me`, {
              cache: "no-store",
            }).catch(() => null);
            if (meRes?.ok) {
              const m = await meRes.json();
              const me = m?.user || m;
              const isSeller = String(data?.seller?._id) === String(me?._id);
              const isBuyer = String(data?.buyer?._id) === String(me?._id);
              if (isSeller) setRole("seller");
              else if (isBuyer) setRole("buyer");
            }
          }

          if (preTxnId) {
            const k = String(data?.kind || "BUY_SELL").toUpperCase();
            setKind(
              k === "DONATION"
                ? "DONATION"
                : k === "AUCTION"
                  ? "AUCTION"
                  : "BUY_SELL",
            );
          }
        }
      } catch (e) {
        if (mounted) {
          setTxn(null);
          setErr(e?.message || "Failed to load order");
        }
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTxnId, isGeneral]);

  useEffect(() => {
    if (preTxnId) return;
    if (isGeneral) return;

    if (myTxns.length > 0) {
      setSelectedTxnId((prev) =>
        prev && myTxns.some((t) => String(t._id) === String(prev))
          ? prev
          : String(myTxns[0]._id),
      );
    } else {
      setSelectedTxnId("");
    }
  }, [myTxns, preTxnId, isGeneral]);

  const contextLine = useMemo(() => {
    if (!txn) return null;
    return {
      productTitle: txn.product?.title || "-",
      buyer: txn.buyer?.name || txn.buyer?.email || "-",
      seller: txn.seller?.name || txn.seller?.email || "-",
      status: txn.status || "-",
      kind: txn.kind || "-",
    };
  }, [txn]);

  async function submit() {
    try {
      setBusy(true);
      setErr("");

      const cleanDesc = description.trim();
      if (!cleanDesc) {
        setErr("Please describe the issue.");
        return;
      }

      const payload = {
        category,
        description: cleanDesc,
        transactionId: !isGeneral ? selectedTxnId || undefined : undefined,
      };

      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());

      router.push("/support");
      router.refresh();
    } catch (e) {
      setErr(e?.message || "Failed to submit report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-[1200px] mx-auto px-3 mb-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#325082] leading-tight">
            Customer Support
            <span className="text-xl font-bold text-[#325082]">
              {" "}
              / New Report
            </span>
          </h1>
        </div>

        <div className="shrink-0 pt-1">
          <BackButton text="Back to Previous" />
        </div>
      </div>

      {err && <p className="mb-3 text-sm text-red-600">{String(err)}</p>}

      <section className="bg-white ring-1 ring-slate-200 shadow-sm rounded-[6px] p-5 mb-4">
        <div className="text-[15px] font-semibold text-[#325082]">
          Related Order (optional)
        </div>
        <div className="text-[12px] text-slate-500 mt-1">
          Select an order type. Choose General if your report is not about a
          specific order.
        </div>

        <div
          className={`mt-4 grid gap-3 ${
            isGeneral
              ? "sm:grid-cols-1 lg:grid-cols-1"
              : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* Step 1: Kind */}
          <div>
            <label className="text-sm font-medium text-[#1f2f4c]">
              1) Order type
            </label>
            <select
              className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-50"
              value={kind}
              disabled={!!preTxnId}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="GENERAL">General</option>
              <option value="BUY_SELL">Buy/Sell</option>
              <option value="DONATION">Donation</option>
              <option value="AUCTION">Auction</option>
            </select>
          </div>

          {!isGeneral && (
            <>
              {/* Step 2: Role */}
              <div>
                <label className="text-sm font-medium text-[#1f2f4c]">
                  2) I am the
                </label>
                <select
                  className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-50"
                  value={role}
                  disabled={!!preTxnId || !!preAs}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="buyer">
                    {kind === "DONATION"
                      ? "Recipient"
                      : kind === "AUCTION"
                        ? "Bidder / Winner"
                        : "Buyer"}
                  </option>
                  <option value="seller">
                    {kind === "DONATION"
                      ? "Donor"
                      : kind === "AUCTION"
                        ? "Auction Seller"
                        : "Seller"}
                  </option>
                </select>
              </div>

              {/* Step 3: Transaction */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium text-[#1f2f4c]">
                  3) Select order
                </label>
                <select
                  className="w-full mt-1 border border-slate-200 rounded-md p-2 text-sm bg-white disabled:bg-slate-50"
                  value={selectedTxnId}
                  onChange={(e) => setSelectedTxnId(e.target.value)}
                  disabled={!!preTxnId || myTxns.length === 0}
                >
                  {myTxns.length === 0 ? (
                    <option value="">No orders found</option>
                  ) : (
                    <>
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
                      <option value="">No specific order</option>
                    </>
                  )}
                </select>

                {myTxns.length === 0 && !preTxnId && (
                  <div className="mt-1 text-[12px] text-slate-500">
                    No{" "}
                    {kind === "DONATION"
                      ? "donation"
                      : kind === "AUCTION"
                        ? "auction"
                        : "buy/sell"}{" "}
                    orders found for this role.
                  </div>
                )}

                {!!preTxnId && (
                  <div className="mt-1 text-[12px] text-slate-500">
                    This order is auto-selected from Order Details.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

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

      <section className="bg-white p-5 rounded-xl shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-semibold text-[#325082]">
            Report details
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Priority</span>
            <PriorityTagPreview value={computedPriority} />
          </div>
        </div>

        <div className="mt-4">
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

          <div className="mt-2 text-[12px] text-slate-500">
            Priority is automatically assigned by TrustLoop.
          </div>
        </div>

        <div className="mt-3">
          <label className="text-sm font-medium text-[#1f2f4c]">
            Description
          </label>
          <textarea
            rows={6}
            className="w-full mt-1 border border-slate-200 rounded-md p-3 text-sm"
            placeholder="Explain what happened (time/date, attempts to contact, proof, and what you want TrustLoop to do)."
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
