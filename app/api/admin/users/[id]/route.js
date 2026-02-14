// app/api/admin/users/[id]/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return { ok: false, res: new Response("Unauthorized", { status: 401 }) };
  }

  await connectDB();
  const me = await User.findOne({ email: session.user.email }).lean();

  if (!me || me.role !== "admin") {
    return { ok: false, res: new Response("Forbidden", { status: 403 }) };
  }

  return { ok: true, me };
}

async function safeJson(req) {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ✅ Admin PATCH: role/status/credits/reason
export async function PATCH(req, ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const { params } = ctx;
    const { id } = await params;

    const body = await safeJson(req);
    if (body === null)
      return new Response("Invalid JSON body", { status: 400 });

    await connectDB();
    const user = await User.findById(id);
    if (!user) return new Response("User not found", { status: 404 });

    const isDev = String(gate.me.adminRank || "NORMAL") === "DEVELOPER";
    const isSelf = user.email === gate.me.email;
    const targetIsProtected =
      String(user.adminRank || "NORMAL") === "DEVELOPER" ||
      user.role === "admin";

    // ✅ Self: ONLY allow postingCredits changes (everything else forbidden)
    if (isSelf) {
      const forbidden = [
        "role",
        "status",
        "banType",
        "banDays",
        "bannedReason",
        "resetImage",
      ];
      if (forbidden.some((k) => k in body)) {
        return new Response("You cannot modify your own role, ban, or image.", {
          status: 400,
        });
      }
    }

    // ✅ NEW: Normal admins can NEVER change role (even for users)
    if (!isDev && "role" in body) {
      return new Response("Only developer admins can change user roles.", {
        status: 403,
      });
    }

    // ✅ Non-dev admins cannot modify admins/developers (BUT allow self postingCredits)
    if (!isDev && !isSelf && targetIsProtected) {
      const forbidden = [
        "status",
        "banType",
        "banDays",
        "bannedReason",
        "resetImage",
        "postingCredits",
      ];
      if (forbidden.some((k) => k in body)) {
        return new Response(
          "Only developer admins can modify other admins/developers.",
          { status: 403 },
        );
      }
    }

    const allowed = [
      "role",
      "postingCredits",
      "status",
      "banType",
      "banDays",
      "bannedReason",
      "resetImage",
    ];

    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;

      if (key === "role") {
        const next = String(body.role || "").toLowerCase();
        if (!["user", "admin"].includes(next))
          return new Response("Invalid role", { status: 400 });
        user.role = next;
      }

      if (key === "postingCredits") {
        const n = Number(body.postingCredits);
        if (!Number.isFinite(n) || n < 0)
          return new Response("Invalid postingCredits", { status: 400 });
        user.postingCredits = n;
      }

      if (key === "resetImage") {
        if (body.resetImage === true) {
          user.image = "/default-profile.jpg";
        }
      }

      if (key === "bannedReason") {
        user.bannedReason = String(body.bannedReason || "").trim();
      }

      if (key === "banType") {
        const t = String(body.banType || "").toUpperCase();
        if (!["PERMANENT", "TEMPORARY"].includes(t))
          return new Response("Invalid banType", { status: 400 });
        user.banType = t;
        if (t === "PERMANENT") user.bannedUntil = undefined;
      }

      if (key === "banDays") {
        const days = Number(body.banDays);
        if (!Number.isFinite(days) || days <= 0)
          return new Response("Invalid banDays", { status: 400 });

        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        user.bannedUntil = until;
        user.banType = "TEMPORARY";
      }

      if (key === "status") {
        const next = String(body.status || "").toLowerCase();
        if (!["active", "banned"].includes(next))
          return new Response("Invalid status", { status: 400 });

        if (next === "active") {
          user.status = "active";
          user.banType = undefined;
          user.bannedUntil = undefined;
          user.bannedAt = undefined;
          user.bannedReason = "";
        } else {
          user.status = "banned";
          user.bannedAt = user.bannedAt || new Date();
          if (!user.banType) user.banType = "PERMANENT";
        }
      }
    }

    user.updatedAt = new Date();
    await user.save();

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("❌ Admin user PATCH error:", err);
    return new Response("Server Error", { status: 500 });
  }
}

// ✅ Admin DELETE (unchanged)
export async function DELETE(_, ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const { params } = ctx;
    const { id } = await params;

    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) return new Response("User not found", { status: 404 });

    const isDev = String(gate.me.adminRank || "NORMAL") === "DEVELOPER";
    const isSelf = user.email === gate.me.email;
    const targetIsProtected =
      String(user.adminRank || "NORMAL") === "DEVELOPER" ||
      user.role === "admin";

    if (isSelf) {
      return new Response("You cannot delete your own account.", {
        status: 400,
      });
    }

    if (!isDev && targetIsProtected) {
      return new Response(
        "Only developer admins can delete admins/developers.",
        { status: 403 },
      );
    }

    await User.findByIdAndDelete(id);
    return new Response("Deleted", { status: 200 });
  } catch (err) {
    console.error("❌ Admin user DELETE error:", err);
    return new Response("Server Error", { status: 500 });
  }
}
