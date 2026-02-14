export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import GlobalSetting from "@/models/GlobalSetting";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  // Not logged in => we still want to know if maintenance is enabled
  await connectDB();

  const gs =
    (await GlobalSetting.findOne({ key: "global" })
      .select("maintenance")
      .lean()) || null;

  const maintenanceEnabled = !!gs?.maintenance?.enabled;

  if (!email) {
    return Response.json(
      {
        loggedIn: false,
        banned: false,
        isAdmin: false,
        maintenance: maintenanceEnabled,
      },
      { status: 200 },
    );
  }

  const u = await User.findOne({ email }).select("status role").lean();
  const isAdmin = String(u?.role || "user") === "admin";

  return Response.json(
    {
      loggedIn: true,
      banned: u?.status === "banned",
      isAdmin,
      maintenance: maintenanceEnabled,
    },
    { status: 200 },
  );
}
