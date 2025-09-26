// app/admin/products/AdminProductsClient.js
"use client";

import { useMemo, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/solid";
import ConfirmModal from "@/components/ConfirmModal";
import TxnToolbar from "@/components/admin/TxnToolbar";
import ActionButton from "@/components/ActionButton";

export default function AdminProductsClient({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [err, setErr] = useState("");

  // UI
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // search (apply-on-click/enter)
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");

  const leftSearchBar = (
    <div className="w-full max-w-sm">
      <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px]">
        <input
          className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
          placeholder="Search for any products..."
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQ(qDraft);
          }}
        />
        <button
          type="button"
          onClick={() => setQ(qDraft)}
          className="shrink-0 bg-[#325082] text-white px-4 py-[7px] rounded-[3px] hover:opacity-90 text-sm"
        >
          Search
        </button>
      </div>
    </div>
  );

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const t = (s) => String(s || "").toLowerCase();
    const qq = t(q);
    if (!qq) return products;
    return products.filter(
      (p) =>
        t(p.title).includes(qq) ||
        t(p.category).includes(qq) ||
        t(p.owner?.email).includes(qq) ||
        t(p.owner?.name).includes(qq)
    );
  }, [products, q]);

  function askDelete(id) {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  }

  async function deleteProduct(id) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setProducts((prev) =>
        prev.filter((p) => (p._id?.toString?.() || p._id) !== id)
      );
    } catch (e) {
      alert(e.message || "Failed to delete product");
    }
  }

  return (
    <>
      {/* Mobile header: title (left) + Delete (right) */}
      <div className="sm:hidden flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-[#325082]">Products</h1>
        <ActionButton
          text="Delete"
          variant={deleteMode ? "dangerPrimaryClick" : "dangerOutlineHover"}
          onClick={() => setDeleteMode((v) => !v)}
          className="h-[36px] px-4 text-sm"
        />
      </div>

      {/* Desktop title */}
      <h1 className="hidden sm:block text-2xl font-bold text-[#325082] mb-2">
        Products
      </h1>

      {/* Desktop toolbar (search left, Delete button right) */}
      <div className="hidden sm:block">
        <TxnToolbar
          className="mb-2"
          deleteMode={deleteMode}
          onToggleDelete={() => setDeleteMode((v) => !v)}
          editMode={false}
          onToggleEdit={() => {}}
          statusFilter="ALL"
          onChangeFilter={() => {}}
          showFilter={false}
          showEdit={false}
          leftSlot={leftSearchBar}
        />
      </div>

      {/* Mobile search */}
      <div className="sm:hidden mb-2">{leftSearchBar}</div>

      <div className="bg-white p-5 rounded-xl shadow-md">
        {err && <p className="text-red-600 mb-2">Error: {String(err)}</p>}
        {!products && !err && (
          <p className="text-gray-500">Loading products…</p>
        )}

        {products && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2 border-b font-medium w-10 text-center">
                    #
                  </th>
                  <th className="p-2 border-b font-medium w-[30%]">Title</th>
                  <th className="p-2 border-b font-medium">Price</th>
                  <th className="p-2 border-b font-medium">Category</th>
                  <th className="p-2 border-b font-medium">Owner</th>
                  <th className="p-2 border-b font-medium">Type</th>
                  <th className="p-2 border-b font-medium">Availability</th>
                  <th className="p-2 border-b font-medium">Visibility</th>
                  <th className="p-2 border-b font-medium">Updated</th>
                  <th className="p-2 border-b font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => {
                  const id = p._id?.toString?.() || p._id;
                  return (
                    <tr
                      key={id}
                      className={`${
                        deleteMode
                          ? "hover:bg-red-50 cursor-pointer"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        if (deleteMode) askDelete(id);
                      }}
                    >
                      <td className="p-2 text-center text-gray-600">
                        {idx + 1}
                      </td>
                      <td className="p-2 w-[30%]">
                        <div className="flex items-center gap-3">
                          {p.defaultImage && (
                            <img
                              src={p.defaultImage}
                              alt=""
                              className="w-10 h-10 object-cover rounded shrink-0"
                            />
                          )}
                          <div className="font-medium break-words">
                            {p.title}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        ฿{Number(p.price).toLocaleString()}
                      </td>
                      <td className="p-2 capitalize">{p.category || "-"}</td>
                      <td className="p-2">
                        <div className="leading-tight">
                          <div className="font-medium">
                            {p.owner?.name || "-"}
                          </div>
                          <div className="text-xs text-gray-600">
                            {p.owner?.email || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 capitalize">{p.type || "-"}</td>
                      <td className="p-2">
                        {p.isAvailable ? (
                          <span className="text-green-600 font-semibold">
                            Available
                          </span>
                        ) : (
                          <span className="text-red-500 font-semibold">
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {p.isHidden ? (
                          <span className="text-red-500 font-semibold">
                            Hidden
                          </span>
                        ) : (
                          <span className="text-green-600 font-semibold">
                            Visible
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {new Date(p.updatedAt || p.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2">
                        {deleteMode ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 p-1"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              askDelete(id);
                            }}
                          >
                            <TrashIcon className="w-5 h-5" />
                            <span className="text-sm font-semibold">
                              Delete
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        variant="danger"
        message="Delete this product? This cannot be undone."
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={async () => {
          setConfirmOpen(false);
          if (pendingDeleteId) await deleteProduct(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </>
  );
}
