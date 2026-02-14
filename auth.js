// auth.js
import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

function calcRemainingDays(bannedUntil) {
  if (!bannedUntil) return 0;
  const ms = new Date(bannedUntil).getTime() - Date.now();
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return Math.max(1, d);
}

function safeReason(reason) {
  // keep URL reasonable + avoid weird chars
  const r = String(reason || "").trim();
  if (!r) return "";
  return r.slice(0, 160); // truncate (adjust if you want)
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],

  pages: {
    error: "/", // redirect auth errors back to "/"
  },

  callbacks: {
    async signIn({ user }) {
      const email = user?.email;
      if (!email) return false;

      await connectDB();

      // ✅ maintenance check
      const gs = await (await import("@/models/GlobalSetting")).default
        .findOne({ key: "global" })
        .select("maintenance")
        .lean();

      const maintenanceEnabled = !!gs?.maintenance?.enabled;
      const maintenanceMsg = String(gs?.maintenance?.message || "")
        .trim()
        .slice(0, 160);

      // ✅ fetch user record to know role + ban
      const u = await User.findOne({ email })
        .select("status role banType bannedUntil bannedReason")
        .lean();

      const isAdmin = String(u?.role || "user") === "admin";

      // ✅ If maintenance is ON and not admin -> block sign in
      if (maintenanceEnabled && !isAdmin) {
        const qs = new URLSearchParams();
        qs.set("error", "maintenance");
        if (maintenanceMsg) qs.set("message", maintenanceMsg);
        return `/?${qs.toString()}`;
      }

      // ✅ ban logic (your existing logic)
      if (u?.status === "banned") {
        const banType = String(u.banType || "PERMANENT");
        const until = u.bannedUntil
          ? new Date(u.bannedUntil).toISOString()
          : "";
        const days =
          banType === "TEMPORARY" && u.bannedUntil
            ? String(calcRemainingDays(u.bannedUntil))
            : "";

        const reason = safeReason(u.bannedReason);

        const qs = new URLSearchParams();
        qs.set("error", "banned");
        qs.set("banType", banType);
        if (until) qs.set("until", until);
        if (days) qs.set("days", days);
        if (reason) qs.set("reason", reason);

        return `/?${qs.toString()}`;
      }

      return true;
    },
  },
});
