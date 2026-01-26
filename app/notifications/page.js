// app/notifications/page.js
import NavBar from "@/components/NavBar";
import BackButton from "@/components/BackButton";
import NotificationsListClient from "./NotificationsListClient";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ ADD THIS helper
function dedupeNotifications(items = []) {
  const seen = new Set();

  return items.filter((n) => {
    const key =
      n._id ||
      `${n.type || n.kind}|${n.transaction || ""}|${n.createdAt || n.at}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNotificationsOnServer() {
  const h = await headers();
  const host = h.get("host") || "";
  const proto = process.env.NODE_ENV === "development" ? "http" : "https";
  const url = `${proto}://${host}/api/notifications?limit=20`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") || "" },
  });

  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function NotificationsPage() {
  const data = await fetchNotificationsOnServer();
  const rawItems = Array.isArray(data?.items) ? data.items : [];

  // ✅ ONLY change here
  const items = dedupeNotifications(rawItems);

  return (
    <>
      <NavBar />
      <main className="max-w-[1200px] mx-auto mb-6 px-3 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#325082]">Notifications</h1>
          <BackButton />
        </div>

        <NotificationsListClient initialItems={items} />
      </main>
    </>
  );
}
