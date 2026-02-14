export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import GlobalSetting from "@/models/GlobalSetting";

async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false, status: 401, message: "Unauthorized" };

  await connectDB();
  const me = await User.findOne({ email }).select("_id role").lean();
  if (!me || String(me.role) !== "admin") {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true, me };
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return new Response(gate.message, { status: gate.status });

  const doc =
    (await GlobalSetting.findOne({ key: "global" })
      .select("maintenance")
      .lean()) || null;

  return Response.json(
    {
      maintenance: {
        enabled: !!doc?.maintenance?.enabled,
        message: String(doc?.maintenance?.message || ""),
        updatedAt: doc?.maintenance?.updatedAt || null,
      },
    },
    { status: 200 },
  );
}

export async function PATCH(req) {
  const gate = await requireAdmin();
  if (!gate.ok) return new Response(gate.message, { status: gate.status });

  const body = await req.json().catch(() => ({}));
  const enabled = !!body?.maintenance?.enabled;
  const message = String(body?.maintenance?.message || "").slice(0, 160);

  const next = await GlobalSetting.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        maintenance: {
          enabled,
          message,
          updatedAt: new Date(),
          updatedBy: gate.me._id,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .select("maintenance")
    .lean();

  return Response.json(
    {
      maintenance: {
        enabled: !!next?.maintenance?.enabled,
        message: String(next?.maintenance?.message || ""),
        updatedAt: next?.maintenance?.updatedAt || null,
      },
    },
    { status: 200 },
  );
}
