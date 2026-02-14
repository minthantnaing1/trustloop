"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import ActionButton from "@/components/ActionButton";
import {
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold text-[#325082]">{value}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, rightSlot, children }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-bold text-[#325082]">{title}</div>
          {subtitle ? (
            <div className="text-sm text-gray-500 mt-0.5">{subtitle}</div>
          ) : null}
        </div>
        {rightSlot || null}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-[#325082]" : "bg-gray-300"}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AdminSettingsClient() {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // saved
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  // draft
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftMsg, setDraftMsg] = useState("");

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

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      const enabled = !!data?.maintenance?.enabled;
      const msg = String(data?.maintenance?.message || "");

      setSavedEnabled(enabled);
      setSavedMsg(msg);
      setUpdatedAt(data?.maintenance?.updatedAt || null);

      setDraftEnabled(enabled);
      setDraftMsg(msg);
    } catch (e) {
      setErr(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dirty =
    savedEnabled !== draftEnabled || String(savedMsg) !== String(draftMsg);

  const stats = useMemo(() => {
    return {
      mode: draftEnabled ? "Maintenance" : "Normal",
      access: draftEnabled ? "Admins only" : "All users",
      updated: updatedAt ? "Yes" : "—",
    };
  }, [draftEnabled, updatedAt]);

  const statusPill = (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 rounded-full ${
        draftEnabled
          ? "ring-amber-200/70 bg-amber-50/70 text-amber-800"
          : "ring-emerald-200/70 bg-emerald-50/70 text-emerald-700"
      }`}
    >
      {draftEnabled ? "ON" : "OFF"}
    </span>
  );

  async function save() {
    setErr("");
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maintenance: { enabled: draftEnabled, message: draftMsg },
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();

    const enabled = !!data?.maintenance?.enabled;
    const msg = String(data?.maintenance?.message || "");

    setSavedEnabled(enabled);
    setSavedMsg(msg);
    setUpdatedAt(data?.maintenance?.updatedAt || null);

    setDraftEnabled(enabled);
    setDraftMsg(msg);
  }

  const confirmText = draftEnabled
    ? "Turn ON maintenance mode? All non-admin users will be redirected to the login page and cannot sign in."
    : "Turn OFF maintenance mode? All users will be able to access TrustLoop normally.";

  return (
    <>
      <div className="sm:hidden mb-3">
        <h1 className="text-2xl font-bold text-[#325082]">Settings</h1>
      </div>

      <h1 className="hidden sm:block text-2xl font-bold text-[#325082] mb-3">
        Settings
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatCard label="System Mode" value={stats.mode} />
        <StatCard label="Access" value={stats.access} />
        <StatCard label="Updated" value={stats.updated} />
      </div>

      {err ? (
        <div className="mb-3 bg-white rounded-xl shadow p-4 border border-red-200">
          <div className="text-red-700 font-semibold">Error</div>
          <div className="text-sm text-red-700/90">{String(err)}</div>
        </div>
      ) : null}

      <SectionCard
        title="Maintenance Mode"
        subtitle="When enabled, only admins can sign in and access TrustLoop. All other users are redirected to the login page."
        rightSlot={
          <div className="inline-flex items-center gap-2">
            {statusPill}
            <WrenchScrewdriverIcon className="w-5 h-5 text-gray-400" />
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  {draftEnabled ? (
                    <ShieldExclamationIcon className="w-5 h-5 text-amber-700" />
                  ) : (
                    <ShieldCheckIcon className="w-5 h-5 text-emerald-700" />
                  )}
                  Maintenance access
                </div>
                <div className="text-sm text-gray-500">
                  {draftEnabled
                    ? "Only admins can use the website."
                    : "All users can use the website."}
                </div>
              </div>

              <Toggle
                checked={draftEnabled}
                onChange={setDraftEnabled}
                disabled={loading}
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notice message (optional)
              </label>
              <input
                className="w-full border border-gray-300 rounded-[10px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#325082]/20"
                placeholder="Example: We'll be back at 10:00 PM (BKK)."
                value={draftMsg}
                onChange={(e) => setDraftMsg(e.target.value)}
                maxLength={160}
                disabled={loading}
              />
              <div className="text-[11px] text-gray-500 mt-1">
                {String(draftMsg || "").length}/160
                {updatedAt ? (
                  <span className="ml-2">
                    • Last updated: {new Date(updatedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 p-4">
              <div className="text-sm font-semibold text-gray-700">
                More settings coming soon
              </div>
              <div className="text-sm text-gray-500">
                This page is designed to expand (fees, limits, feature flags,
                etc.).
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800 mb-1">
                Changes
              </div>

              <div className="text-sm text-gray-500 mb-3">
                {dirty
                  ? "You have unsaved changes."
                  : "Everything is up to date."}
              </div>

              <ActionButton
                text="Save changes"
                variant="submitPrimaryClick"
                className={`w-full ${dirty ? "" : "opacity-60 cursor-not-allowed"}`}
                disabled={loading || !dirty}
                onClick={() => {
                  openConfirm({
                    variant: "warning",
                    message: confirmText,
                    action: async () => {
                      await save();
                    },
                  });
                }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

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
