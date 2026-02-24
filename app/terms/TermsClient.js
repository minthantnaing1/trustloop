"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import ActionButton from "@/components/ActionButton";

export default function TermsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const callbackUrl = useMemo(() => {
    const raw = sp.get("callbackUrl") || "/home";
    if (!raw.startsWith("/")) return "/home";
    return raw;
  }, [sp]);

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onAccept() {
    if (!checked || loading) return;
    setLoading(true);

    const r = await fetch("/api/users/accept-terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: "v1" }),
    });

    setLoading(false);

    if (r.ok) router.replace(callbackUrl);
    else await signOut({ callbackUrl: "/" });
  }

  async function onCancel() {
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="h-screen overflow-hidden flex">
      {/* LEFT 50% — gradient + logo (fully covered) */}
      <aside className="w-1/2 relative overflow-hidden bg-[image:var(--tl-gradient)] flex items-center justify-center">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-24 bottom-[-120px] h-96 w-96 rounded-full bg-white/10 blur-2xl" />

        <div className="relative text-center px-10">
          <img
            src="/TrustLoopLogo.png"
            alt="TrustLoop"
            className="h-[260px] object-contain mx-auto drop-shadow"
          />
          <div className="mt-3 text-white/90 text-sm">
            buy smart, sell safe: stay in the loop
          </div>
        </div>
      </aside>

      {/* RIGHT 50% — white background (fully covered) */}
      <main className="w-1/2 bg-white h-screen overflow-hidden flex items-center justify-center px-10">
        <div className="w-full max-w-[40rem] h-[calc(100vh-80px)] flex flex-col">
          <div className="text-center">
            <div className="text-[#325082] text-[16px] font-semibold border-b-2 border-[#325082] inline-block pb-1">
              Terms & Privacy Notice
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Please read and accept to continue using TrustLoop.
            </div>
          </div>

          <div className="mt-5 flex-1 min-h-0 rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="text-sm font-semibold text-[#1f2f4c]">
                TrustLoop User Agreement
              </div>
              <div className="text-[12px] text-gray-600 mt-1">
                AU student-only • Safe trading • Privacy-respecting
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-auto px-4 py-4 text-[13px] text-slate-700 leading-relaxed space-y-5">
              <Section title="1) Eligibility & account">
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>TrustLoop is for Assumption University students only.</li>
                  <li>Use accurate information and your real identity.</li>
                  <li>
                    No impersonation, fake accounts, or bypassing restrictions.
                  </li>
                </ul>
              </Section>

              <Section title="2) Listings & prohibited content">
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>No illegal, prohibited, or dangerous items.</li>
                  <li>
                    Listings must be truthful (photos, condition, description,
                    price).
                  </li>
                  <li>No scams, misleading posts, or fake availability.</li>
                  <li>
                    Admins may hide/remove content that violates these rules.
                  </li>
                </ul>
              </Section>

              <Section title="3) Transactions & safety">
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    Deliver/Meet in safe, public areas (preferably on nearby AU
                    campus).
                  </li>
                  <li>Be respectful. No harassment, or threats.</li>
                  <li>
                    Verify items before confirming acceptance/buyer received.
                  </li>
                  <li>Do not misuse refunds, disputes, or report systems.</li>
                </ul>
              </Section>

              <Section title="4) Privacy & PDPA-minded notice">
                <p className="mt-2">
                  TrustLoop respects your privacy. We collect and use only the
                  information needed to operate the platform (account access,
                  listings, transactions, and support). We do not sell your
                  personal data to third parties.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    We use data to operate TrustLoop, prevent abuse/fraud, and
                    provide support.
                  </li>
                  <li>
                    We do not sell your data and do not use it for unrelated
                    advertising.
                  </li>
                </ul>
              </Section>

              <Section title="5) Enforcement">
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>
                    Violations may lead to warnings, temporary bans, or
                    permanent bans.
                  </li>
                  <li>
                    Admins may take action to protect platform safety and trust.
                  </li>
                </ul>
              </Section>

              <div className="text-[12px] text-gray-500">
                By accepting, you confirm you understand these rules and agree
                to follow them.
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <div>
                <div className="text-sm font-semibold text-[#1f2f4c]">
                  I agree to the TrustLoop Terms & Privacy Notice.
                </div>
                <div className="text-[12px] text-gray-600 mt-1">
                  If you cancel, you will be signed out.
                </div>
              </div>
            </label>

            <div className="flex gap-3">
              <ActionButton
                text="Cancel"
                variant={checked ? "disabledClick" : "outlineClick"}
                onClick={onCancel}
                disabled={checked}
              />
              <ActionButton
                text={loading ? "Saving..." : "Accept & Continue"}
                variant={!checked || loading ? "disabledClick" : "primaryClick"}
                onClick={onAccept}
                disabled={!checked || loading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </section>
  );
}
