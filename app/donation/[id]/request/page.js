"use client";
import { useEffect, useState } from "react";

function Badge({ children, variant = "default" }) {
  const map = {
    unread: "bg-blue-100 text-blue-700",
    read: "bg-yellow-100 text-yellow-700",
    default: "bg-gray-100 text-gray-700",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${map[variant]}`}>{children}</span>;
}

export default function DonationRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load(role = "donor") {
    setLoading(true);
    const res = await fetch(`/api/donation-contacts?role=${role}`, { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => { load("donor"); }, []);

  async function action(id, action, text) {
    await fetch(`/api/donation-contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, text }),
    });
    load("donor");
  }

  if (loading) return <div className="max-w-5xl mx-auto p-6">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Recent Contact Requests</h2>
        <div className="flex gap-2">
          <button className="btn btn-sm" onClick={() => load("donor")}>As Donor</button>
          <button className="btn btn-sm btn-outline" onClick={() => load("requester")}>Sent</button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((c) => (
          <div key={c._id} className="rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between">
              <div className="flex items-center gap-3">
                <img src={c.itemId?.defaultImage || c.itemId?.images?.[0] || "/placeholder.png"} className="w-12 h-12 rounded object-cover" />
                <div>
                  <div className="font-medium">{c.itemId?.title || "Donation Item"}</div>
                  <div className="text-sm text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={c.readByDonor ? "read" : "unread"}>{c.readByDonor ? "read" : "unread"}</Badge>
                <Badge>{c.status}</Badge>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <img src={c.requesterId?.image || "/avatar.png"} className="w-8 h-8 rounded-full" />
              <div className="text-sm">
                <span className="font-medium">{c.requesterName}</span>
                <span className="text-gray-500"> — {c.requesterEmail}</span>
              </div>
            </div>

            <blockquote className="mt-3 p-3 bg-gray-50 rounded text-sm">“{c.message}”</blockquote>

            <div className="mt-3 flex flex-wrap gap-2">
              {!c.readByDonor && (
                <button className="btn btn-outline btn-sm" onClick={() => action(c._id, "read")}>
                  Mark as Read
                </button>
              )}
              {c.status !== "accepted" && (
                <button className="btn btn-success btn-sm" onClick={() => action(c._id, "accept")}>
                  Accept Request
                </button>
              )}
              {c.status !== "declined" && (
                <button className="btn btn-error btn-sm" onClick={() => action(c._id, "decline")}>
                  Decline
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const text = prompt("Reply message");
                  if (text) action(c._id, "reply", text);
                }}
              >
                Respond
              </button>
            </div>

            {/* Optional: show small thread */}
            {Array.isArray(c.replies) && c.replies.length > 0 && (
              <div className="mt-3 space-y-1 text-sm">
                {c.replies.map((r, i) => (
                  <div key={i} className="pl-3 border-l">
                    <span className="text-gray-500 mr-2">{new Date(r.createdAt).toLocaleString()}</span>
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
