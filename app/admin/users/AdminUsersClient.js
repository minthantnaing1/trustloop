"use client";

import { useEffect, useMemo, useState } from "react";
import TxnToolbar from "@/components/admin/TxnToolbar";
import Link from "next/link";
import SlipLink from "@/components/SlipLink";
import ConfirmModal from "@/components/ConfirmModal";
import { TrashIcon, PencilSquareIcon } from "@heroicons/react/24/solid";

const DEFAULT_AVATAR = "/default-profile.jpg";

function StatusTag({ status }) {
  const s = String(status || "active").toLowerCase();
  const map = {
    active: "ring-emerald-200/70 bg-emerald-50/70 text-emerald-700",
    banned: "ring-red-200/70 bg-red-50/70 text-red-700",
  };
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 rounded-full ${
        map[s] || map.active
      }`}
    >
      {label}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-[#325082]">{value}</div>
    </div>
  );
}

export default function AdminUsersClient({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers || []);
  const [err, setErr] = useState("");

  const [me, setMe] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/users/me", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (mounted) setMe(data?.user || null);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isDev = String(me?.adminRank || "NORMAL") === "DEVELOPER";

  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmVariant, setConfirmVariant] = useState("warning");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  function openConfirm({ variant = "warning", message, action }) {
    setConfirmVariant(variant);
    setConfirmMsg(message);
    setPendingAction(() => action);
    setConfirmOpen(true);
  }

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
        t(u.status).includes(qq) ||
        t(u.defaultScanCode).includes(qq),
    );
  }, [users, q]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "admin").length;
    const banned = users.filter((u) => u.status === "banned").length;
    const normalUsers = users.filter((u) => u.role !== "admin").length;
    return { total, admins, normalUsers, banned };
  }, [users]);

  async function patchUser(id, body) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  async function deleteUser(id) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return true;
  }

  function setDraftField(id, field, value) {
    setDrafts((prev) => {
      const base = prev[id] || {};
      return { ...prev, [id]: { ...base, [field]: value } };
    });
  }

  function clearDraft(id) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function getRowValue(u, id, field) {
    const d = drafts[id];
    if (d && Object.prototype.hasOwnProperty.call(d, field)) return d[field];
    return u[field];
  }

  // ✅ FIX: compare with stable defaults (so "" can be recognized vs undefined)
  function rowHasChanges(u, id) {
    const d = drafts[id];
    if (!d) return false;

    const norm = (k, v) => {
      if (k === "banDays") return String(v ?? "");
      if (k === "bannedReason") return String(v ?? "");
      return String(v ?? "");
    };

    return Object.keys(d).some((k) => norm(k, d[k]) !== norm(k, u[k]));
  }

  function calcRemainingDays(bannedUntil) {
    if (!bannedUntil) return "";
    const ms = new Date(bannedUntil).getTime() - Date.now();
    const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return Math.max(1, d);
  }

  function calcOriginalBanDays(u) {
    if (Number(u?.banDays) > 0) return Number(u.banDays);
    if (u?.banType === "TEMPORARY" && u?.bannedUntil) {
      return calcRemainingDays(u.bannedUntil);
    }
    return "";
  }

  // ✅ FIX: derive correct defaults when entering edit (PERMANENT first)
  function getInitialBanType(u) {
    const bt = String(u?.banType || "").toUpperCase();
    if (bt === "TEMPORARY" || bt === "PERMANENT") return bt;
    return "PERMANENT";
  }

  async function saveSelected(u) {
    const id = u._id?.toString?.() || u._id;
    const d = drafts[id] || {};
    if (!Object.keys(d).length) return;

    const isSelf = me?.email && u.email === me.email;

    const payload = {};
    const s = (v) => String(v ?? "");
    const n = (v) => Number(v ?? 0);

    if (isSelf) {
      if (
        "postingCredits" in d &&
        n(d.postingCredits) !== n(u.postingCredits)
      ) {
        payload.postingCredits = n(d.postingCredits);
      } else {
        return;
      }
    } else {
      if ("role" in d && s(d.role) !== s(u.role)) payload.role = d.role;

      if ("postingCredits" in d && n(d.postingCredits) !== n(u.postingCredits))
        payload.postingCredits = n(d.postingCredits);

      if ("status" in d && s(d.status) !== s(u.status))
        payload.status = d.status;

      // ✅ ban fields
      const nextStatus = String(d.status ?? u.status ?? "active");
      const nextBanType = String(
        d.banType ?? u.banType ?? "PERMANENT",
      ).toUpperCase();

      if ("banType" in d && s(d.banType) !== s(u.banType))
        payload.banType = nextBanType;

      // ✅ IMPORTANT: only send banDays if TEMPORARY
      if (nextStatus === "banned" && nextBanType === "TEMPORARY") {
        if ("banDays" in d) {
          const days = n(d.banDays);
          if (days > 0) payload.banDays = days;
        }
      } else {
        // if admin switched from TEMPORARY -> PERMANENT, ensure we do NOT send old days
        // (backend should set bannedUntil null when PERMANENT)
      }

      // ✅ allow clearing reason (send "" too)
      if (
        "bannedReason" in d &&
        s(d.bannedReason) !== s(u.bannedReason ?? "")
      ) {
        payload.bannedReason = s(d.bannedReason);
      }

      if ("resetImage" in d && d.resetImage === true) payload.resetImage = true;

      if (!Object.keys(payload).length) return;
    }

    const updated = await patchUser(id, payload);

    setUsers((prev) =>
      prev.map((x) => {
        const xid = x._id?.toString?.() || x._id;
        return xid === id ? { ...x, ...updated } : x;
      }),
    );

    clearDraft(id);
    setSelectedId(null);
  }

  function exitEditMode() {
    setEditMode(false);
    setSelectedId(null);
    setDrafts({});
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-[#325082] mb-4">Users</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Users" value={stats.normalUsers} />
        <StatCard label="Admins" value={stats.admins} />
        <StatCard label="Banned" value={stats.banned} />
      </div>

      <div className="mb-2">
        <TxnToolbar
          className="mb-0"
          leftSlot={leftSearchBar}
          showFilter={false}
          statusFilter="ALL"
          onChangeFilter={() => {}}
          kindFilter="BUY_SELL"
          onChangeKind={() => {}}
          editMode={editMode}
          deleteMode={deleteMode}
          showEdit={true}
          showDelete={true}
          editLabel="Edit"
          exitEditLabel="Exit edit"
          onToggleEdit={() => {
            const next = !editMode;
            if (next) {
              setEditMode(true);
              setDeleteMode(false);
            } else {
              exitEditMode();
            }
          }}
          onToggleDelete={() => {
            const next = !deleteMode;
            setDeleteMode(next);
            if (next) exitEditMode();
          }}
        />
      </div>
      <div className="bg-white p-5 rounded-xl shadow-md">
        {err && <p className="text-red-600 mb-2">Error: {String(err)}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2 border-b font-medium w-10 text-center">#</th>
                <th className="p-2 border-b font-medium">Image</th>
                <th className="p-2 border-b font-medium">Name</th>
                <th className="p-2 border-b font-medium">Email</th>
                <th className="p-2 border-b font-medium">Role</th>
                <th className="p-2 border-b font-medium">Status</th>
                <th className="p-2 border-b font-medium">QR Scan</th>
                <th className="p-2 border-b font-medium">Credits</th>
                <th className="p-2 border-b font-medium">Joined</th>
                <th className="p-2 border-b font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((u, idx) => {
                const id = u._id?.toString?.() || u._id;
                const isSelected = editMode && selectedId === id;

                const isSelf = me?.email && u.email === me.email;

                const targetIsUser = u.role !== "admin";
                const canEditRole = isDev && !isSelf;
                const canEditStatus = !isSelf && (isDev || targetIsUser);
                const canEditCredits = isSelf || isDev || targetIsUser;
                const canResetImage = !isSelf && (isDev || targetIsUser);

                const role = String(getRowValue(u, id, "role") || "user");
                const status = String(getRowValue(u, id, "status") || "active");
                const credits = getRowValue(u, id, "postingCredits") ?? 0;

                const banType = String(
                  getRowValue(u, id, "banType") || getInitialBanType(u),
                );
                const banDays = getRowValue(u, id, "banDays") ?? "";
                const reason = String(
                  getRowValue(u, id, "bannedReason") ?? u.bannedReason ?? "",
                );

                const changed = isSelected && rowHasChanges(u, id);

                const rowClass = deleteMode
                  ? "hover:bg-red-50 cursor-pointer"
                  : editMode
                    ? "cursor-pointer"
                    : "hover:bg-gray-50";

                const selectedGlow = isSelected
                  ? "bg-[#325082]/5 ring-1 ring-[#325082]/30"
                  : "";

                const previewAvatar = drafts?.[id]?.resetImage
                  ? DEFAULT_AVATAR
                  : u.image || DEFAULT_AVATAR;

                return (
                  <tr
                    key={id}
                    className={`align-top ${rowClass} ${selectedGlow}`}
                    onClick={() => {
                      if (deleteMode) {
                        openConfirm({
                          variant: "danger",
                          message: `Delete ${u.email}? This cannot be undone.`,
                          action: async () => {
                            await deleteUser(id);
                            setUsers((prev) =>
                              prev.filter(
                                (x) => (x._id?.toString?.() || x._id) !== id,
                              ),
                            );
                          },
                        });
                        return;
                      }

                      if (editMode) {
                        setSelectedId(id);
                        setDrafts((prev) => {
                          if (prev[id]) return prev;

                          const initBanType = getInitialBanType(u);

                          return {
                            ...prev,
                            [id]: {
                              role: u.role || "user",
                              status: u.status || "active",
                              postingCredits: u.postingCredits ?? 0,

                              // ✅ REAL WORLD DEFAULTS
                              banType: initBanType,
                              banDays:
                                initBanType === "TEMPORARY"
                                  ? calcOriginalBanDays(u)
                                  : "",
                              bannedReason: u.bannedReason ?? "", // ✅ allow clearing
                            },
                          };
                        });
                      }
                    }}
                  >
                    <td className="p-2 text-center text-gray-600">{idx + 1}</td>

                    <td className="p-2 whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full ring-1 ring-gray-200 overflow-hidden bg-gray-50">
                          <img
                            src={previewAvatar}
                            alt={u.name || "User"}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {isSelected && canResetImage && (
                          <button
                            type="button"
                            className="text-[11px] px-2 py-1 rounded-[8px] border border-gray-300 hover:bg-gray-50 leading-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDraftField(id, "resetImage", true);
                            }}
                          >
                            Default
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-2">{u.name || "-"}</td>
                    <td className="p-2 break-all">{u.email}</td>

                    <td className="p-2 capitalize">
                      {isSelected && canEditRole ? (
                        <select
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          value={role}
                          onChange={(e) =>
                            setDraftField(id, "role", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <span
                          className={
                            String(u.role) === "admin"
                              ? "text-[#325082] font-semibold"
                              : ""
                          }
                        >
                          {u.role || "user"}
                        </span>
                      )}
                    </td>

                    <td className="p-2">
                      {isSelected && canEditStatus ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StatusTag status={status} />
                            <select
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              value={status}
                              onChange={(e) => {
                                const next = e.target.value;

                                // ✅ if switching away from banned, clear ban inputs (real-world behavior)
                                if (next !== "banned") {
                                  setDraftField(id, "banType", "PERMANENT");
                                  setDraftField(id, "banDays", "");
                                  setDraftField(id, "bannedReason", "");
                                }

                                setDraftField(id, "status", next);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="active">active</option>
                              <option value="banned">banned</option>
                            </select>
                          </div>

                          {status === "banned" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <select
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                                value={banType}
                                onChange={(e) => {
                                  const nextType = e.target.value;

                                  // ✅ switching to PERMANENT should clear days immediately
                                  if (nextType === "PERMANENT") {
                                    setDraftField(id, "banDays", "");
                                  }

                                  setDraftField(id, "banType", nextType);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="PERMANENT">
                                  Until released
                                </option>
                                <option value="TEMPORARY">For days</option>
                              </select>

                              {banType === "TEMPORARY" ? (
                                <input
                                  type="number"
                                  min={1}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                                  placeholder="Days (e.g. 7)"
                                  value={banDays}
                                  onChange={(e) =>
                                    setDraftField(id, "banDays", e.target.value)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div className="text-xs text-gray-500 flex items-center">
                                  Admin can release anytime.
                                </div>
                              )}

                              <input
                                className="md:col-span-2 border border-gray-300 rounded px-2 py-1 text-sm"
                                placeholder="Ban reason (optional)"
                                value={reason}
                                onChange={(e) =>
                                  setDraftField(
                                    id,
                                    "bannedReason",
                                    e.target.value,
                                  )
                                } // ✅ can clear to ""
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <StatusTag status={u.status || "active"} />

                          {u.status === "banned" ? (
                            <div className="mt-1 space-y-0.5">
                              {u.banType === "TEMPORARY" && u.bannedUntil ? (
                                <div className="text-[11px] text-gray-500">
                                  {calcRemainingDays(u.bannedUntil)} day(s) •
                                  Until:{" "}
                                  {new Date(u.bannedUntil).toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[11px] text-gray-500">
                                  Until admin releases
                                </div>
                              )}

                              {u.bannedReason ? (
                                <div className="text-[11px] text-gray-500">
                                  Reason: {u.bannedReason}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </td>

                    <td className="p-2 whitespace-nowrap">
                      {u.defaultScanCode ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 border border-gray-200 rounded overflow-hidden bg-gray-50 shrink-0">
                            <img
                              src={u.defaultScanCode}
                              alt="QR scan"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <SlipLink
                            url={u.defaultScanCode}
                            title={`QR Scan – ${u.name || u.email}`}
                            buttonClassName="text-xs"
                          >
                            View
                          </SlipLink>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="p-2">
                      {isSelected ? (
                        <input
                          type="number"
                          min={0}
                          disabled={!canEditCredits}
                          className={`w-20 border border-gray-300 rounded px-2 py-1 text-sm ${
                            !canEditCredits
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : ""
                          }`}
                          value={credits}
                          onChange={(e) =>
                            setDraftField(id, "postingCredits", e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          title={
                            !canEditCredits
                              ? "Normal admins can edit credits only for users."
                              : ""
                          }
                        />
                      ) : (
                        <span>{u.postingCredits ?? 0}</span>
                      )}
                    </td>

                    <td className="p-2">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="p-2 whitespace-nowrap align-top">
                      {deleteMode ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfirm({
                              variant: "danger",
                              message: `Delete ${u.email}? This cannot be undone.`,
                              action: async () => {
                                await deleteUser(id);
                                setUsers((prev) =>
                                  prev.filter(
                                    (x) =>
                                      (x._id?.toString?.() || x._id) !== id,
                                  ),
                                );
                              },
                            });
                          }}
                        >
                          <TrashIcon className="w-5 h-5" />
                          <span className="text-sm font-semibold">Delete</span>
                        </button>
                      ) : editMode ? (
                        isSelected ? (
                          <div className="flex flex-col gap-2 w-[92px]">
                            <button
                              type="button"
                              className={`w-full inline-flex justify-center items-center gap-2 px-2 py-1.5 rounded-[10px] text-sm ${
                                changed
                                  ? "bg-[#325082] text-white hover:opacity-90"
                                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
                              }`}
                              disabled={!changed}
                              onClick={(e) => {
                                e.stopPropagation();
                                openConfirm({
                                  variant: "warning",
                                  message: `Save changes for ${u.email}?`,
                                  action: async () => {
                                    const d = drafts[id] || {};
                                    const st = String(
                                      d.status ?? u.status ?? "active",
                                    );
                                    const bt = String(
                                      d.banType ?? u.banType ?? "PERMANENT",
                                    );

                                    if (
                                      st === "banned" &&
                                      bt === "TEMPORARY" &&
                                      !Number(d.banDays)
                                    ) {
                                      throw new Error("Please enter ban days.");
                                    }

                                    await saveSelected(u);
                                  },
                                });
                              }}
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                              Save
                            </button>

                            <button
                              type="button"
                              className="w-full border border-gray-300 px-2 py-1.5 rounded-[10px] hover:bg-gray-50 text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearDraft(id);
                                setSelectedId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">Select row</span>
                        )
                      ) : (
                        <Link
                          href={`/admin/users/${id}`}
                          className="text-sm underline text-[#325082] underline-offset-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          User Details
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
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

      <ConfirmModal
        isOpen={confirmOpen}
        variant={confirmVariant}
        message={confirmMsg}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
        onConfirm={async () => {
          setConfirmOpen(false);
          const fn = pendingAction;
          setPendingAction(null);
          if (!fn) return;
          try {
            await fn();
          } catch (e) {
            setErr(e.message || "Action failed");
          }
        }}
      />
    </>
  );
}
