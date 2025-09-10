// app/my-orders/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ActionButton from "@/components/ActionButton";
import StatusPill from "@/components/StatusPill";
import Stepper from "@/components/Stepper";

function isPendingUploadActive(txn) {
  if (txn?.status !== "PENDING_UPLOAD") return false;
  const exp = txn?.expiresAt ? new Date(txn.expiresAt).getTime() : 0;
  return exp > Date.now();
}

function formatMMSS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Countdown({ expiresAt }) {
  const [remainMs, setRemainMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );

  useEffect(() => {
    const tick = () =>
      setRemainMs(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return <b className="font-mono tabular-nums">{formatMMSS(remainMs)}</b>;
}

function MethodTag({ method }) {
  if (!method) return null;
  const label =
    method === "DELIVERY"
      ? "Delivery"
      : method === "MEETUP"
      ? "Meetup"
      : method;
  const tone =
    method === "DELIVERY"
      ? "ring-indigo-200/70 bg-indigo-50/60 text-indigo-700"
      : "ring-emerald-200/70 bg-emerald-50/60 text-emerald-700";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium ring-1 rounded-full ${tone}`}
    >
      {label}
    </span>
  );
}

/** Animated sliding pill role switch (800ms) */
function RoleSwitch({ role, setRole }) {
  const isBuyer = role === "buyer";

  return (
    <div className="relative inline-grid grid-cols-2 rounded-full bg-slate-100 p-1 shadow-sm w-[260px]">
      {/* Sliding highlight */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#325082]
                    transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                    transform-gpu will-change-transform
                    ${isBuyer ? "translate-x-0" : "translate-x-full"}`}
      />
      <button
        type="button"
        onClick={() => setRole("buyer")}
        className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                    ${
                      isBuyer
                        ? "text-white"
                        : "text-[#325082] hover:text-[#22365a]"
                    }`}
        aria-pressed={isBuyer}
      >
        As Buyer
      </button>
      <button
        type="button"
        onClick={() => setRole("seller")}
        className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                    ${
                      !isBuyer
                        ? "text-white"
                        : "text-[#325082] hover:text-[#22365a]"
                    }`}
        aria-pressed={!isBuyer}
      >
        As Seller
      </button>
    </div>
  );
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [role, setRole] = useState("buyer");
  const [buyerTxns, setBuyerTxns] = useState(null);
  const [sellerTxns, setSellerTxns] = useState(null);
  const [errBuyer, setErrBuyer] = useState("");
  const [errSeller, setErrSeller] = useState("");
  const [pendingActionId, setPendingActionId] = useState(null);

  // keep track of scheduled refresh timers so we can clean them up
  const refreshTimersRef = useRef([]);

  // re-fetch function for a single role
  async function refreshRoleLists(which) {
    try {
      if (which === "buyer") {
        const r = await fetch("/api/transactions/mine?role=buyer", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setBuyerTxns(Array.isArray(data) ? data : []);
      } else {
        const r = await fetch("/api/transactions/mine?role=seller", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setSellerTxns(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore – page already handles error text on first load
    }
  }

  function clearExpiryTimers() {
    refreshTimersRef.current.forEach((t) => clearTimeout(t));
    refreshTimersRef.current = [];
  }

  // schedule an automatic refresh right when any PENDING_UPLOAD expires
  function scheduleExpiryRefresh(items, whichRole) {
    clearExpiryTimers();
    if (!Array.isArray(items)) return;

    const now = Date.now();
    for (const t of items) {
      if (t?.status !== "PENDING_UPLOAD" || !t?.expiresAt) continue;
      const ms = new Date(t.expiresAt).getTime() - now;
      if (Number.isFinite(ms) && ms > 0) {
        const handle = setTimeout(() => {
          // small buffer to let server sweep run
          refreshRoleLists(whichRole);
        }, ms + 250);
        refreshTimersRef.current.push(handle);
      }
    }
  }

  // when buyer list changes, schedule auto-refreshes for buyer
  useEffect(() => {
    if (role === "buyer") scheduleExpiryRefresh(buyerTxns, "buyer");
    return () => clearExpiryTimers();
  }, [buyerTxns, role]);

  // when seller list changes, schedule auto-refreshes for seller
  useEffect(() => {
    if (role === "seller") scheduleExpiryRefresh(sellerTxns, "seller");
    return () => clearExpiryTimers();
  }, [sellerTxns, role]);

  // extra safety: clear any pending timers when the page unmounts
  useEffect(() => {
    return () => {
      refreshTimersRef.current.forEach((t) => clearTimeout(t));
      refreshTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/transactions/mine?role=buyer", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (mounted) setBuyerTxns(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setErrBuyer(e.message || "Failed to load your orders");
      }
    })();
    (async () => {
      try {
        const r = await fetch("/api/transactions/mine?role=seller", {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (mounted) setSellerTxns(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setErrSeller(e.message || "Failed to load your sales");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function actOnTxn(id, action) {
    try {
      setPendingActionId(id);
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());

      setSellerTxns((prev) =>
        (prev || []).map((t) =>
          (t._id?.toString?.() || t._id) === id
            ? {
                ...t,
                status:
                  action === "seller_accept"
                    ? "SELLER_ACCEPTED"
                    : action === "seller_cancel"
                    ? "CANCELLED_BY_SELLER"
                    : t.status,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );

      if (action === "seller_accept") router.push(`/my-orders/${id}#delivery`);
    } catch (e) {
      alert(e.message || "Action failed");
    } finally {
      setPendingActionId(null);
    }
  }

  const list = role === "buyer" ? buyerTxns : sellerTxns;
  const err = role === "buyer" ? errBuyer : errSeller;

  return (
    <>
      {/* smooth page fade on initial mount */}
      <style jsx global>{`
        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <NavBar />

      <main
        className="max-w-[1200px] mx-auto px-4 mb-6 transition-all duration-[800ms]"
        style={{ animation: "fadeSlide 800ms ease-out" }}
      >
        <div className="flex items-center justify-between gap-3 mb-6 flex-nowrap">
          <h1 className="text-2xl font-bold text-[#1f2d4d] sm:leading-none whitespace-nowrap">
            My Orders
          </h1>
          <RoleSwitch role={role} setRole={setRole} />
        </div>

        {/* Seller-only progress (UI stepper at step 2) */}
        {role === "seller" && (
          <div
            className="mb-4"
            style={{ animation: "fadeSlide 800ms ease-out" }}
          >
            <Stepper current={2} variant="seller" className="px-1" />
          </div>
        )}

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
        {!list && !err && (
          <div className="mb-4 text-sm text-slate-500">Loading…</div>
        )}

        {/* Entire list fades/slides on tab change */}
        <section
          key={role}
          className="space-y-4"
          style={{ animation: "fadeSlide 800ms ease-out" }}
        >
          {list &&
            list.length > 0 &&
            list.map((t) => {
              const id = t._id?.toString?.() || t._id;
              const isSeller = role === "seller";
              const canAcceptOrCancel =
                isSeller && t.status === "ESCROW_FUNDED";
              const counterparty = isSeller ? t.buyer : t.seller;
              const method = t.fulfillment?.method;

              const accent =
                method === "DELIVERY"
                  ? "before:bg-indigo-400/70"
                  : "before:bg-emerald-400/70";

              return (
                <article
                  key={id}
                  className={`relative bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-md
                              transition-all duration-[800ms] rounded-none
                              before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
                >
                  {/* Banner */}
                  <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50">
                    <div className="text-[14px] text-slate-600">
                      {isSeller ? "Buyer" : "Seller"}:&nbsp;
                      <span className="font-medium text-[#325082]">
                        {counterparty?.name || counterparty?.email || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-slate-500">Deliver Method:</span>
                      <MethodTag method={method} />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-slate-500">Order status:</span>
                      <StatusPill status={t.status} />
                    </div>
                  </header>

                  {/* Two-part row: image | info/actions */}
                  <div className="p-4 flex gap-4 items-center">
                    <div className="w-[120px] h-[120px] bg-slate-100 ring-1 ring-slate-200 overflow-hidden shrink-0">
                      {t.product?.defaultImage ? (
                        <img
                          src={t.product.defaultImage}
                          alt={t.product?.title || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col items-end text-right justify-between">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-[#15243f] line-clamp-2">
                          {t.product?.title || "-"}
                        </h3>
                        <div className="mt-2 text-[13px] text-slate-700 space-y-1">
                          <div>
                            <span className="text-slate-500">Updated:</span>{" "}
                            <time>
                              {new Date(
                                t.updatedAt || t.createdAt
                              ).toLocaleString()}
                            </time>
                          </div>
                          <div>
                            <span className="text-slate-500">Total:</span>{" "}
                            <span className="font-semibold">
                              ฿{Number(t.total || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex gap-2 flex-wrap justify-end">
                        {isSeller && canAcceptOrCancel && (
                          <>
                            <ActionButton
                              text="Accept the Order"
                              variant="primaryClick"
                              disabled={pendingActionId === id}
                              onClick={() => actOnTxn(id, "seller_accept")}
                            />
                            <ActionButton
                              text="Cancel the Order"
                              variant="dangerOutlineHover"
                              disabled={pendingActionId === id}
                              onClick={() => actOnTxn(id, "seller_cancel")}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 mx-4"></div>

                  {/* Timeline summary + button, dropdown unchanged */}
                  <details className="px-4 pb-1">
                    <summary className="list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#325082] underline underline-offset-2">
                          View timeline
                        </span>

                        {/* 👇 Replace this single Link with a small group */}
                        <div className="flex items-center gap-2">
                          {/* NEW: Buyer can go back to pay page while still within 5 mins */}
                          {role === "buyer" && isPendingUploadActive(t) && (
                            <Link href={`buy-sell/pay/${id}`}>
                              <ActionButton
                                text="Pay & Upload"
                                variant="outlineClick"
                              />
                            </Link>
                          )}

                          <Link href={`/my-orders/${id}`}>
                            <ActionButton
                              text="Order Detail"
                              variant="primaryClick"
                            />
                          </Link>
                        </div>
                      </div>
                      {/* ⚠️ Warning note — same visibility logic as the Pay button */}
                      {role === "buyer" &&
                        isPendingUploadActive(t) &&
                        t.expiresAt && (
                          <div className="text-center mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
                            Payment pending — please click{" "}
                            <span className="font-semibold">
                              “Pay &amp; Upload”
                            </span>{" "}
                            and complete your payment within{" "}
                            <Countdown expiresAt={t.expiresAt} /> or this order
                            will be automatically cancelled.
                          </div>
                        )}
                    </summary>

                    <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto p-3">
                      {Array.isArray(t.timeline) && t.timeline.length > 0 ? (
                        <ul className="space-y-2">
                          {[...t.timeline].reverse().map((e, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between"
                            >
                              <div className="text-sm text-slate-800">
                                {e.action || "-"}
                              </div>
                              <time className="text-xs text-slate-500">
                                {e.at ? new Date(e.at).toLocaleString() : "-"}
                              </time>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-slate-500">
                          No events yet.
                        </div>
                      )}
                    </div>
                  </details>
                </article>
              );
            })}

          {list && list.length === 0 && (
            <div
              className="border bg-white p-10 text-center rounded-none transition-all duration-[800ms]"
              style={{ animation: "fadeSlide 800ms ease-out" }}
            >
              <div className="text-lg font-medium text-[#1f2d4d] mb-1">
                Nothing here yet
              </div>
              <p className="text-sm text-slate-500">
                {role === "buyer"
                  ? "You haven’t placed any orders."
                  : "You don’t have any sales."}
              </p>
              <div className="mt-4">
                <Link
                  href="/buy-sell"
                  className="inline-flex items-center px-4 py-2 bg-[#325082] text-white hover:bg-[#2b446e] text-sm rounded-lg transition-colors duration-[800ms]"
                >
                  Explore products
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
