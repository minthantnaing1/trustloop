"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import OrderRow from "@/components/OrderRow";
import ActionButton from "@/components/ActionButton";
import StatusPill from "@/components/StatusPill";
import AdminReceiptLink from "@/components/admin/AdminReceiptLink";

export default function MyOrdersPage() {
  const [role, setRole] = useState("buyer"); // "buyer" | "seller"
  const [buyerTxns, setBuyerTxns] = useState(null);
  const [sellerTxns, setSellerTxns] = useState(null);
  const [errBuyer, setErrBuyer] = useState("");
  const [errSeller, setErrSeller] = useState("");

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
                    ? "CANCELLED"
                    : t.status,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (e) {
      alert(e.message || "Action failed");
    }
  }

  const list = role === "buyer" ? buyerTxns : sellerTxns;
  const err = role === "buyer" ? errBuyer : errSeller;

  return (
    <>
      <NavBar />
      <div className="max-w-[1200px] mx-auto px-4 py-8 mt-[75px]">
        {/* Header with role switch on the right */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-[#325082]">My Orders</h1>
          <div className="bg-white rounded-full shadow-sm border overflow-hidden">
            <button
              onClick={() => setRole("buyer")}
              className={`px-6 py-2 text-sm ${
                role === "buyer"
                  ? "bg-[#325082] text-white"
                  : "text-[#325082] hover:bg-[#325082]/10"
              }`}
            >
              As Buyer
            </button>
            <button
              onClick={() => setRole("seller")}
              className={`px-6 py-2 text-sm ${
                role === "seller"
                  ? "bg-[#325082] text-white"
                  : "text-[#325082] hover:bg-[#325082]/10"
              }`}
            >
              As Seller
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {err && <p className="text-red-600">{err}</p>}
          {!list && !err && <p className="text-gray-500">Loading…</p>}

          {list &&
            list.length > 0 &&
            list.map((t) => {
              const id = t._id?.toString?.() || t._id;
              const isSeller = role === "seller";
              const canAcceptOrCancel =
                isSeller && t.status === "ESCROW_FUNDED";

              // Counterparty line (always show the other side)
              const counterparty = isSeller ? t.buyer : t.seller;
              const counterpartyLine = counterparty ? (
                <span className="text-sm text-gray-600">
                  {isSeller ? "Buyer:" : "Seller:"}{" "}
                  <span className="text-[#325082] font-medium">
                    {counterparty.name || counterparty.email}
                  </span>
                  {counterparty.name && (
                    <span className="ml-1 text-gray-500 text-xs">
                      ({counterparty.email})
                    </span>
                  )}
                </span>
              ) : null;

              const receiptLink = t.buyerReceiptUrl ? (
                <a
                  href={t.buyerReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline text-[#325082] underline-offset-2"
                >
                  Receipt
                </a>
              ) : null;

              const detailsLink = (
                <Link
                  href={`/buy-sell/${t.product?._id || ""}`}
                  className="text-sm underline text-[#325082] underline-offset-2"
                >
                  Details
                </Link>
              );

              return (
                <OrderRow
                  key={id}
                  title={t.product?.title || "-"}
                  image={t.product?.defaultImage}
                  status={<StatusPill status={t.status} />}
                  subtitleRight={counterpartyLine}
                  metaLeft={[
                    [
                      "Updated",
                      new Date(t.updatedAt || t.createdAt).toLocaleString(),
                    ],
                  ]}
                  rightArea={
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm text-gray-700">
                        Total{" "}
                        <span className="font-semibold">
                          ฿{Number(t.total || 0).toLocaleString()}
                        </span>
                      </div>

                      {/* Links row */}
                      <div className="flex gap-3 text-sm">
                        {receiptLink}
                        {detailsLink}
                      </div>

                      {/* Actions row (seller only) */}
                      {canAcceptOrCancel && (
                        <div className="flex gap-2">
                          <ActionButton
                            text="Accept"
                            variant="primaryClick"
                            className="h-[34px] px-3"
                            onClick={() => actOnTxn(id, "seller_accept")}
                          />
                          <ActionButton
                            text="Cancel"
                            variant="dangerOutlineHover"
                            className="h-[34px] px-3"
                            onClick={() => actOnTxn(id, "seller_cancel")}
                          />
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}

          {list && list.length === 0 && (
            <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
              {role === "buyer" ? "No orders yet." : "No sales yet."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
