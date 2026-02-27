// app/my-orders/MyOrdersClient.js
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import StatusPill from "@/components/StatusPill";
import Stepper from "@/components/Stepper";
import Timeline from "@/components/Timeline";
import MyOrdersStatusFilter from "@/components/MyOrdersStatusFilter";

function isPendingPaymentActive(txn) {
  if (txn?.status !== "PENDING_PAYMENT") return false;
  const exp = txn?.expiresAt ? new Date(txn.expiresAt).getTime() : 0;
  return exp > Date.now();
}

function formatHHMMSS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s,
  ).padStart(2, "0")}`;
}

function Countdown({ expiresAt, onExpire }) {
  const [remainMs, setRemainMs] = useState(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  );

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemainMs(ms);

      if (ms === 0 && onExpire) {
        onExpire(); // 🔥 trigger refresh
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);

  return <b className="font-mono tabular-nums">{formatHHMMSS(remainMs)}</b>;
}

/** Animated sliding pill role switch (800ms) */
function labelsForKind(kind) {
  if (kind === "DONATION") return { left: "As Recipient", right: "As Donor" };
  if (kind === "AUCTION") return { left: "As Bidder", right: "As Seller" };
  return { left: "As Buyer", right: "As Seller" }; // BUY_SELL
}

function RoleSwitch({ role, setRole, kind }) {
  const isLeft = role === "buyer";
  const { left, right } = labelsForKind(kind);

  return (
    <div className="relative inline-grid grid-cols-2 rounded-full bg-slate-100 p-1 shadow-sm w-[214px]">
      <span
        aria-hidden="true"
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[#325082]
                    transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                    transform-gpu will-change-transform
                    ${isLeft ? "translate-x-0" : "translate-x-full"}`}
      />
      <button
        type="button"
        onClick={() => setRole("buyer")}
        className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                    ${
                      isLeft
                        ? "text-white"
                        : "text-[#325082] hover:text-[#22365a]"
                    }`}
        aria-pressed={isLeft}
      >
        {left}
      </button>
      <button
        type="button"
        onClick={() => setRole("seller")}
        className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                    ${
                      !isLeft
                        ? "text-white"
                        : "text-[#325082] hover:text-[#22365a]"
                    }`}
        aria-pressed={!isLeft}
      >
        {right}
      </button>
    </div>
  );
}

function KindSwitch({ kind, setKind }) {
  const options = [
    { v: "BUY_SELL", label: "Buy/Sell" },
    { v: "DONATION", label: "Donation" },
    { v: "AUCTION", label: "Auction" },
  ];

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.v === kind),
  );

  return (
    <div className="relative inline-grid grid-cols-3 rounded-full bg-slate-100 p-1 shadow-sm w-[270px]">
      {/* Sliding background (1/3 width) */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-[#325082]
                   transition-transform duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)]
                   transform-gpu will-change-transform"
        style={{
          width: "calc((100% - 0.5rem) / 3)", // subtract left+right padding (p-1 = 0.25rem*2)
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />

      {options.map((o) => {
        const active = kind === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => setKind(o.v)}
            className={`relative z-10 h-9 px-3 text-sm font-medium rounded-full transition-colors duration-[800ms]
                        ${
                          active
                            ? "text-white"
                            : "text-[#325082] hover:text-[#22365a]"
                        }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------ INNER CLIENT (uses useSearchParams) ------------------ */
export default function MyOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");

  const [role, setRole] = useState(
    roleParam === "seller" || roleParam === "buyer" ? roleParam : "buyer",
  );
  const [buyerTxns, setBuyerTxns] = useState(null);
  const [sellerTxns, setSellerTxns] = useState(null);
  const [errBuyer, setErrBuyer] = useState("");
  const [errSeller, setErrSeller] = useState("");
  const [pendingActionId, setPendingActionId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(statusParam || "ALL");

  const kindParam = searchParams.get("kind");
  const [kindFilter, setKindFilter] = useState(
    ["BUY_SELL", "DONATION", "AUCTION"].includes(kindParam)
      ? kindParam
      : "BUY_SELL",
  );

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

  // schedule an automatic refresh right when any PENDING_PAYMENT expires
  function scheduleExpiryRefresh(items, whichRole) {
    clearExpiryTimers();
    if (!Array.isArray(items)) return;

    const now = Date.now();
    for (const t of items) {
      if (t?.status !== "PENDING_PAYMENT" || !t?.expiresAt) continue;
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

  function hasActivePending(list) {
    return Array.isArray(list) && list.some((t) => isPendingPaymentActive(t));
  }

  useEffect(() => {
    // refresh when user comes back to this tab
    const onFocus = () => refreshRoleLists(role);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshRoleLists(role);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const currentList = role === "buyer" ? buyerTxns : sellerTxns;

    // Only poll if this tab currently shows an active pending payment
    if (!hasActivePending(currentList)) return;

    let tries = 0;
    const maxTries = 20; // 20 * 3s = 60s

    const id = setInterval(async () => {
      tries += 1;
      await refreshRoleLists(role);

      // stop after a minute, or once no active pending remains
      const nextList = role === "buyer" ? buyerTxns : sellerTxns;
      if (tries >= maxTries || !hasActivePending(nextList)) {
        clearInterval(id);
      }
    }, 3000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, buyerTxns, sellerTxns]);

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

  async function actOnTxn(id, action, extra = {}) {
    try {
      setPendingActionId(id);

      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }), // include cancelReason
      });

      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();

      // ✅ Optimistic update (local UI)
      const patchLocal = (prev) =>
        (prev || []).map((t) => {
          if ((t._id?.toString?.() || t._id) !== id) return t;

          const nextStatus =
            action === "seller_cancel"
              ? "CANCELLED_BY_SELLER"
              : action === "buyer_cancel"
                ? "CANCELLED_BY_BUYER"
                : t.status;

          const nextCancelReason =
            action === "seller_cancel" || action === "buyer_cancel"
              ? (extra?.cancelReason ?? updated?.cancelReason ?? t.cancelReason)
              : t.cancelReason;

          return {
            ...t,
            status: nextStatus,
            cancelReason: nextCancelReason,
            updatedAt: new Date().toISOString(),
          };
        });

      if (action === "buyer_cancel") {
        setBuyerTxns(patchLocal);
      } else {
        setSellerTxns(patchLocal);
      }

      // ✅ Redirect and refresh logic unified for all kinds
      const kind = (
        updated?.kind ||
        updated?.product?.type ||
        extra?.kind ||
        kindFilter
      ).toUpperCase();

      if (action === "seller_accept") {
        router.push(`/my-orders/${id}#delivery`);
      } else if (action === "seller_cancel") {
        setRole("seller");
        setKindFilter(kind);
        setStatusFilter("CANCELLED_BY_SELLER");
        router.push(
          `/my-orders?role=seller&status=CANCELLED_BY_SELLER&kind=${encodeURIComponent(
            kind,
          )}`,
        );
      }

      // 🪄 Always re-fetch buyer/seller list in background (sync across all kinds)
      await refreshRoleLists(role);
    } catch (e) {
      alert(e.message || "Action failed");
    } finally {
      setPendingActionId(null);
    }
  }

  const rawList = role === "buyer" ? buyerTxns : sellerTxns;
  const list = useMemo(() => {
    if (!Array.isArray(rawList)) return rawList;

    const byKind = rawList.filter((t) => t.kind === kindFilter);

    if (statusFilter === "ALL") return byKind;

    if (role === "buyer" && statusFilter === "BUYER_CONFIRMED") {
      return byKind.filter(
        (t) => t.status === "BUYER_CONFIRMED" || t.status === "PAID_OUT",
      );
    }

    return byKind.filter((t) => t.status === statusFilter);
  }, [rawList, statusFilter, role, kindFilter]);

  useEffect(() => {
    if (role === "buyer" && statusFilter === "PAID_OUT") {
      setStatusFilter("BUYER_CONFIRMED"); // alias to the combined view
    }
  }, [role, statusFilter]);

  const err = role === "buyer" ? errBuyer : errSeller;

  function partyLabel({ isSeller, kind }) {
    if (kind === "DONATION") return isSeller ? "Recipient" : "Donor";
    if (kind === "AUCTION") return isSeller ? "Winner" : "Seller"; // tweak if you like
    return isSeller ? "Buyer" : "Seller"; // default Buy/Sell
  }

  const emptyText =
    kindFilter === "DONATION"
      ? role === "buyer"
        ? "You haven't requested any donations."
        : "No donation requests yet."
      : kindFilter === "AUCTION"
        ? role === "buyer"
          ? "You haven't joined any auctions."
          : "No active auctions."
        : role === "buyer"
          ? "You haven't placed any orders."
          : "You don't have any sales transactions.";

  // ✅ choose the right CTA link + text by kind/role
  const { ctaHref, ctaText } = (() => {
    if (kindFilter === "DONATION") {
      return role === "buyer"
        ? { ctaHref: "/donation", ctaText: "Browse donations" }
        : { ctaHref: "/donation/post", ctaText: "Donate your items" };
    }
    if (kindFilter === "AUCTION") {
      return role === "buyer"
        ? { ctaHref: "/auction", ctaText: "Browse auctions" }
        : { ctaHref: "/auction/post", ctaText: "Create an auction" };
    }
    // default = Buy & Sell
    return role === "buyer"
      ? { ctaHref: "/buy", ctaText: "Browse products" }
      : { ctaHref: "/sell/post", ctaText: "Create a listing" };
  })();

  function setKindAndReset(nextKind) {
    setKindFilter(nextKind);
    setStatusFilter("ALL");
  }

  function setRoleAndReset(nextRole) {
    setRole(nextRole);
    setStatusFilter("ALL");
  }

  useEffect(() => {
    const sp = new URLSearchParams();
    sp.set("role", role);
    sp.set("status", statusFilter);
    sp.set("kind", kindFilter);

    router.replace(`/my-orders?${sp.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, statusFilter, kindFilter]);

  // Keep local state in sync when someone navigates with new query params
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    const nextRole = sp.get("role") === "seller" ? "seller" : "buyer";
    const nextStatus = sp.get("status") || "ALL";
    const rawKind = sp.get("kind");
    const nextKind = ["BUY_SELL", "DONATION", "AUCTION"].includes(rawKind)
      ? rawKind
      : "BUY_SELL";

    if (nextRole !== role) setRole(nextRole);
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
    if (nextKind !== kindFilter) setKindFilter(nextKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

      <main
        className="max-w-[1200px] mx-auto px-3 mb-6 transition-all duration-[800ms]"
        style={{ animation: "fadeSlide 800ms ease-out" }}
      >
        <div className="mb-4">
          {/* Desktop: title + filter on the left, role switch on the right */}
          <div className="hidden sm:flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#325082]">My Orders</h1>
              <MyOrdersStatusFilter
                key={`status-${role}-${kindFilter}`}
                role={role}
                kind={kindFilter}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
            <div className="flex items-center gap-2">
              <KindSwitch kind={kindFilter} setKind={setKindAndReset} />
              <RoleSwitch
                role={role}
                setRole={setRoleAndReset}
                kind={kindFilter}
              />
            </div>
          </div>

          {/* Mobile: title top, filter below, role switch right */}
          <div className="flex flex-col sm:hidden">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-[#325082]">My Orders</h1>
              <RoleSwitch
                role={role}
                setRole={setRoleAndReset}
                kind={kindFilter}
              />
            </div>
            <div className="flex justify-between items-center mt-2 gap-2">
              <MyOrdersStatusFilter
                key={`status-${role}-${kindFilter}`}
                role={role}
                kind={kindFilter}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-[88px] shrink-0"
              />
              <KindSwitch kind={kindFilter} setKind={setKindAndReset} />
            </div>
          </div>
        </div>

        {/* Buyer-only progress (Donation recipient stepper at step 2) */}
        {role === "buyer" && kindFilter === "DONATION" && (
          <div
            key={`stepper-buyer-${kindFilter}`}
            className="mb-4"
            style={{ animation: "fadeSlide 800ms ease-out" }}
          >
            <Stepper current={2} variant="recipient" className="px-1" />
          </div>
        )}

        {/* Seller-only progress (UI stepper at step 2) */}
        {role === "seller" && (
          <div
            key={`stepper-seller-${kindFilter}`}
            className="mb-4"
            style={{ animation: "fadeSlide 800ms ease-out" }}
          >
            {/* <Stepper
              current={2}
              variant={kindFilter === "DONATION" ? "donor" : "seller"}
              className="px-1"
            /> */}
          </div>
        )}

        {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
        {!list && !err && (
          <div className="mb-4 text-sm text-slate-500">Loading…</div>
        )}

        {/* Entire list fades/slides on tab change */}
        <section
          key={`${role}-${kindFilter}`}
          className="space-y-4"
          style={{ animation: "fadeSlide 800ms ease-out" }}
        >
          {list &&
            list.length > 0 &&
            list.map((t) => {
              const id = t._id?.toString?.() || t._id;
              const isSeller = role === "seller";

              // ✅ seller cancel rules (UPDATED)
              // - BUY_SELL: seller cannot cancel anymore (even if PAYMENT_SUCCESSFUL)
              // - DONATION: donor can still cancel while awaiting donor
              const sellerCanCancel =
                isSeller &&
                t.kind === "DONATION" &&
                t.status === "AWAITING_DONOR";

              // ✅ buyer cancel rules (new)
              const buyerCanCancel =
                !isSeller &&
                t.kind === "BUY_SELL" &&
                ["PENDING_PAYMENT", "PAYMENT_SUCCESSFUL"].includes(t.status);

              const canCancelOnly = sellerCanCancel || buyerCanCancel;

              // ✅ Donation accept (seller/donor only)
              const sellerCanAcceptDonation =
                isSeller &&
                t.kind === "DONATION" &&
                t.status === "AWAITING_DONOR";

              const counterparty = isSeller ? t.buyer : t.seller;

              return (
                <article
                  key={id}
                  className={`relative bg-white ring-1 ring-slate-200 shadow-sm hover:shadow-md
                              transition-all duration-[800ms] rounded-none
                              before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#325082]/60`}
                >
                  {/* Banner */}
                  <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50">
                    <div className="text-[15px] font-semibold text-[#325082]">
                      {partyLabel({ isSeller, kind: t.kind })}:&nbsp;
                      <span>
                        {counterparty?.name || counterparty?.email || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[#325082]">Order status:</span>
                      <StatusPill status={t.status} kind={t.kind} />
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
                        <h3 className="text-sm sm:text-base font-semibold text-[#325082] line-clamp-2">
                          {t.product?.title || "-"}
                        </h3>
                        <div className="mt-2 text-[13px] text-slate-700 space-y-1.5">
                          <div className="text-[14px]">
                            <span className="text-slate-500">Total:</span>{" "}
                            <span className="font-semibold text-[#325082]">
                              {Number(t.total || 0) === 0
                                ? "Free"
                                : `฿${Number(t.total).toLocaleString()}`}
                            </span>
                          </div>

                          {/* Request / Cancel / Reject reasons (right-aligned) */}
                          {(t.requestReason ||
                            t.cancelReason ||
                            t.adminRejectReason) && (
                            <div className="flex flex-wrap justify-end items-center gap-x-2 text-[13px] mt-1 text-right">
                              {t.kind === "DONATION" && t.requestReason && (
                                <>
                                  <span className="text-slate-500">
                                    Request reason:
                                  </span>
                                  <span className="font-semibold">
                                    {t.requestReason}
                                  </span>
                                </>
                              )}

                              {/* Cancel reason (can come from either buyer/seller) */}
                              {t.cancelReason && (
                                <>
                                  {t.kind === "DONATION" && t.requestReason && (
                                    <span className="text-slate-400">·</span>
                                  )}
                                  <span className="text-slate-500">
                                    Cancel reason:
                                  </span>
                                  <span className="font-semibold">
                                    {t.cancelReason}
                                  </span>
                                </>
                              )}

                              {/* Admin rejection reason (Buy/Sell only) */}
                              {t.kind === "BUY_SELL" && t.adminRejectReason && (
                                <>
                                  <span className="text-slate-500">
                                    Reject reason:
                                  </span>
                                  <span className="font-semibold">
                                    {t.adminRejectReason}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          <div>
                            <span className="text-slate-500">Updated:</span>{" "}
                            <time>
                              {new Date(
                                t.updatedAt || t.createdAt,
                              ).toLocaleString()}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 mx-4"></div>

                  {/* Timeline summary + button, dropdown unchanged */}
                  <details className="px-4 pb-1">
                    <summary className="list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[#325082] hover:text-[#325082] underline cursor-pointer underline-offset-2">
                          View timeline
                        </span>

                        {/* 👇 Replace this single Link with a small group */}
                        <div className="flex items-center gap-2">
                          {/* Cancel / Reject */}
                          {canCancelOnly && (
                            <ActionButton
                              text={
                                t.kind === "DONATION"
                                  ? isSeller
                                    ? "Reject Request"
                                    : "Cancel Request"
                                  : "Cancel Order"
                              }
                              variant="dangerOutlineHover"
                              disabled={pendingActionId === id}
                              onClick={() => {
                                const reason = prompt(
                                  t.kind === "DONATION"
                                    ? isSeller
                                      ? "Please enter a reason for rejection:"
                                      : "Please enter a reason for cancellation:"
                                    : "Please enter a reason for cancellation:",
                                );
                                if (!reason?.trim()) return;

                                actOnTxn(
                                  id,
                                  isSeller ? "seller_cancel" : "buyer_cancel",
                                  {
                                    cancelReason: reason.trim(),
                                  },
                                );
                              }}
                            />
                          )}

                          {/* ✅ Donation: donor can accept request */}
                          {sellerCanAcceptDonation && (
                            <ActionButton
                              text="Accept"
                              variant="primaryClick"
                              disabled={pendingActionId === id}
                              onClick={() => {
                                actOnTxn(id, "seller_accept", {
                                  kind: "DONATION",
                                });
                              }}
                            />
                          )}

                          {/* ✅ Move Continue Payment into Order Details slot (BUY_SELL + PENDING_PAYMENT, buyer only) */}
                          {role === "buyer" &&
                          ["BUY_SELL", "AUCTION"].includes(t.kind) &&
                          isPendingPaymentActive(t) ? (
                            <ActionButton
                              text="Continue Payment"
                              variant="outlineHover"
                              onClick={async (e) => {
                                e?.preventDefault?.();
                                e?.stopPropagation?.();

                                const res = await fetch("/api/checkout", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ transactionId: id }),
                                });

                                if (!res.ok) {
                                  alert(await res.text());
                                  return;
                                }

                                const { url } = await res.json();
                                window.open(
                                  url,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }}
                            />
                          ) : (
                            /* ✅ Show Order Details only when NOT pending and NOT donation awaiting donor */
                            !(
                              t.status === "PENDING_PAYMENT" ||
                              t.status === "AWAITING_DONOR"
                            ) && (
                              <Link href={`/my-orders/${id}`}>
                                <ActionButton
                                  text="Order Details"
                                  variant="primaryClick"
                                />
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                      {isPendingPaymentActive(t) && t.expiresAt && (
                        <div className="text-center mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
                          {role === "buyer" ? (
                            <>
                              Payment pending — please click{" "}
                              <span className="font-semibold">
                                “Continue Payment”
                              </span>{" "}
                              and complete your payment within{" "}
                              <Countdown
                                expiresAt={t.expiresAt}
                                onExpire={() => refreshRoleLists(role)}
                              />{" "}
                              or this order will be automatically cancelled.
                            </>
                          ) : (
                            <>
                              Payment pending — waiting for buyer to complete
                              payment within{" "}
                              <Countdown
                                expiresAt={t.expiresAt}
                                onExpire={() => refreshRoleLists(role)}
                              />{" "}
                              or this order will be automatically cancelled.
                            </>
                          )}
                        </div>
                      )}
                    </summary>

                    <Timeline
                      events={t.timeline}
                      compact
                      maxHeight="max-h-40"
                      kind={t.kind}
                    />
                  </details>
                </article>
              );
            })}
          {list && list.length === 0 && (
            <div
              className="border border-gray-300 shadow-sm bg-white p-10 text-center rounded-[6px] transition-all duration-[800ms]"
              style={{ animation: "fadeSlide 800ms ease-out" }}
            >
              <div className="text-lg font-medium text-[#1f2d4d] mb-1">
                Nothing here yet
              </div>
              <p className="text-sm text-slate-500">{emptyText}</p>
              <div className="mt-4">
                <Link href={ctaHref}>
                  <ActionButton
                    text={ctaText}
                    variant="primaryHover"
                    className="inline-flex items-center"
                  />
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
