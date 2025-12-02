// app/admin/users/AdminUsersClient.js
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TxnToolbar from "@/components/admin/TxnToolbar";
import SlipLink from "@/components/SlipLink"; // ⬅️ add this

export default function AdminUsersClient({ initialUsers }) {
  const [users] = useState(initialUsers || []);
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");

  const leftSearchBar = (
    <div className="w-full max-w-sm">
      <div className="flex items-center w-full border border-gray-300 shadow-md rounded-[6px] px-[3.5px]">
        <input
          className="min-w-0 flex-1 px-2 py-[10px] text-sm outline-none"
          placeholder="Search for any users..."
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
    if (!Array.isArray(users)) return [];
    const t = (s) => String(s || "").toLowerCase();
    const qq = t(q);
    if (!qq) return users;
    return users.filter(
      (u) =>
        t(u.name).includes(qq) ||
        t(u.email).includes(qq) ||
        t(u.role).includes(qq) ||
        t(u.defaultScanCode).includes(qq)
    );
  }, [users, q]);

  return (
    <>
      {/* Mobile title */}
      <div className="sm:hidden mb-3">
        <h1 className="text-2xl font-bold text-[#325082]">Users</h1>
      </div>

      {/* Desktop title */}
      <h1 className="hidden sm:block text-2xl font-bold text-[#325082] mb-2">
        Users
      </h1>

      {/* Desktop toolbar: only search bar */}
      <div className="hidden sm:block mb-2">
        <TxnToolbar
          className="mb-0"
          leftSlot={leftSearchBar}
          deleteMode={false}
          editMode={false}
          showFilter={false}
          showEdit={false}
          showDelete={false}
          onToggleDelete={() => {}}
          onToggleEdit={() => {}}
          statusFilter="ALL"
          onChangeFilter={() => {}}
        />
      </div>

      {/* Mobile search bar */}
      <div className="sm:hidden mb-2">{leftSearchBar}</div>

      <div className="bg-white p-5 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium w-10 text-center">#</th>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Email</th>
                <th className="p-2 border-b font-medium">Role</th>
                <th className="p-2 border-b font-medium">Default Scan Code</th>
                <th className="p-2 border-b font-medium">Credits</th>
                <th className="p-2 border-b font-medium">Joined</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((u, idx) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="p-2 text-center text-gray-600">{idx + 1}</td>
                  <td className="p-2">{u.name || "-"}</td>
                  <td className="p-2 break-all">{u.email}</td>
                  <td className="p-2 capitalize">{u.role}</td>

                  <td className="p-2">
                    {u.defaultScanCode ? (
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 border border-gray-200 rounded overflow-hidden bg-gray-50 shrink-0">
                          <img
                            src={u.defaultScanCode}
                            alt="Default scan code"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <SlipLink
                          url={u.defaultScanCode}
                          title={`Default Scan Code – ${u.name || u.email}`}
                          buttonClassName="text-xs"
                        >
                          View Scan Code
                        </SlipLink>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="p-2">{u.postingCredits ?? 0}</td>
                  <td className="p-2">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 text-center text-gray-500 text-sm"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
