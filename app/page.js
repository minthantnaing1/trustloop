import LoginButton from "@/components/LoginButton";

export default async function Login({ searchParams }) {
  const sp = (await searchParams) || {};
  const err = String(sp.error || "").toLowerCase();

  // banned params
  const banType = String(sp.banType || "").toUpperCase();
  const days = sp.days ? Number(sp.days) : null;
  const untilIso = sp.until ? String(sp.until) : "";
  const reason = sp.reason ? String(sp.reason) : "";

  const showBanned = err === "banned";

  // maintenance params
  const showMaintenance = err === "maintenance";
  const maintenanceMsg = sp.message ? String(sp.message) : "";

  let line1 = "";
  let line2 = "";

  if (showBanned) {
    if (banType === "TEMPORARY") {
      const d = Number.isFinite(days) && days > 0 ? days : null;
      line1 = d
        ? `Your account is banned for ${d} day(s).`
        : `Your account is temporarily banned.`;

      if (untilIso) {
        const dt = new Date(untilIso);
        if (!Number.isNaN(dt.getTime())) {
          line2 = `Until: ${dt.toLocaleString()}`;
        }
      }
    } else {
      line1 = "Your account is banned until an admin releases it.";
    }
  }

  const fallbackMessage =
    err && !showBanned && !showMaintenance
      ? "Sign in failed. Please try again."
      : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-[image:var(--tl-gradient)] z-[-1]" />

      <div className="mt-[-155px] mb-[12px]">
        <img
          src="/TrustLoopLogo.png"
          alt="TrustLoop Logo"
          className="h-[250px] object-contain"
        />
      </div>

      <div className="relative w-full flex flex-col items-center">
        <div className="bg-white p-8 w-full max-w-[24rem] rounded-2xl shadow-lg border border-gray-300 flex flex-col items-center gap-4 mt-[-40px]">
          <div className="text-[#325082] text-center w-full text-[16px] font-semibold border-b-2 border-[#325082] pb-2">
            Sign In / Sign Up
          </div>

          <LoginButton />
        </div>

        {/* ✅ Maintenance notice */}
        {showMaintenance ? (
          <div className="absolute top-full mt-[-20px] w-full max-w-[34rem] px-3">
            <div className="rounded-2xl border border-amber-200 bg-white/85 backdrop-blur shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  !
                </div>
                <div className="text-amber-900">
                  <div className="font-semibold leading-tight">
                    Maintenance mode
                  </div>
                  <div className="text-[12px] text-amber-800/90">
                    TrustLoop is temporarily unavailable for users.
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 text-sm text-amber-900">
                {maintenanceMsg ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                    {maintenanceMsg}
                  </div>
                ) : (
                  <div className="text-amber-800">
                    Please try again later. Admins can still sign in.
                  </div>
                )}

                <div className="mt-2 text-[12px] text-amber-800/90">
                  Thank you for your patience.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ✅ Banned notice (your existing) */}
        {showBanned ? (
          <div className="absolute top-full mt-[-20px] w-full max-w-[34rem] px-3">
            <div className="rounded-2xl border border-red-200 bg-white/85 backdrop-blur shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-100">
                <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  !
                </div>
                <div className="text-red-800">
                  <div className="font-semibold leading-tight">
                    Access denied
                  </div>
                  <div className="text-[12px] text-red-700/90">
                    You can't sign in to TrustLoop right now.
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 text-sm text-red-800">
                {line1 || line2 ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {line1 ? <div className="font-medium">{line1}</div> : null}
                    {line2 ? <div className="text-red-700">{line2}</div> : null}
                  </div>
                ) : null}

                {reason ? (
                  <div className="mt-2 rounded-xl border border-red-100 bg-red-50/60 px-3 py-2">
                    <span className="font-semibold">Reason:</span> {reason}
                  </div>
                ) : null}

                <div className="mt-2 text-[12px] text-red-700/90">
                  If you think this is a mistake, please contact support.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {fallbackMessage ? (
          <div className="absolute top-full mt-4 w-full max-w-[34rem] px-3">
            <div className="rounded-2xl border border-amber-200 bg-white/85 backdrop-blur shadow-lg px-4 py-3 text-amber-900">
              <div className="font-semibold">Sign in failed</div>
              <div className="text-sm text-amber-800">{fallbackMessage}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
