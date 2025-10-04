"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";

// --- tiny inline icons (no deps) ---
const MailIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth="1.7" d="M4 6h16v12H4z" />
    <path strokeWidth="1.7" d="m22 7-10 7L2 7" />
  </svg>
);
const PhoneIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeWidth="1.7" d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h2a2 2 0 0 1 2 1.72c.12.92.34 1.81.65 2.66a2 2 0 0 1-.45 2.11L7.1 9.9a16 16 0 0 0 6 6l1.41-1.41a2 2 0 0 1 2.11-.45c.85.31 1.74.53 2.66.65A2 2 0 0 1 22 16.92Z" />
  </svg>
);
const PaperPlane = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="m2.01 21 20-9L2 3l.01 7 14 2-14 2z" />
  </svg>
);

// --- sample seed data (replace with API) ---
const seed = [
  {
    id: "r1",
    timeAgo: "2 hours ago",
    unread: true,
    listingTitle: "Mini Fridge",
    listingImage:
      "https://images.unsplash.com/photo-1567016543651-c0e1a7f1b7f2?q=80&w=600&auto=format&fit=crop",
    requester: {
      name: "Sarah M.",
      campus: "North Campus",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
    },
    message:
      "Hi! I'm really interested in the mini fridge. Is it still available? I can pick it up this weekend.",
    contact: { type: "email", value: "sarah.martinez@university.edu" },
    status: "pending", // "pending" | "accepted" | "declined"
  },
  {
    id: "r2",
    timeAgo: "5 hours ago",
    unread: false,
    listingTitle: "Mini Fridge",
    listingImage:
      "https://images.unsplash.com/photo-1567016543651-c0e1a7f1b7f2?q=80&w=600&auto=format&fit=crop",
    requester: {
      name: "Mike R.",
      campus: "South Campus",
      avatar:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop",
    },
    message:
      "Hey! I saw your mini fridge listing. Would you be willing to hold it until tomorrow? I can come by after my classes.",
    contact: { type: "phone", value: "(555) 123-4567" },
    status: "pending",
  },
  {
    id: "r3",
    timeAgo: "1 day ago",
    unread: false,
    listingTitle: "Study Lamp",
    listingImage:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=600&auto=format&fit=crop",
    requester: {
      name: "Ann T.",
      campus: "Dorm A",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    },
    message:
      "Is the study lamp still available for donation? I can meet at the library lobby.",
    contact: { type: "email", value: "ann.t@university.edu" },
    status: "accepted",
  },
];

// --- pills/buttons ---
function ReadPill({ unread }) {
  const tone = unread
    ? "bg-blue-100 text-blue-700 ring-blue-200"
    : "bg-yellow-100 text-yellow-700 ring-yellow-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ring-1 ${tone}`}>
      {unread ? "unread" : "read"}
    </span>
  );
}

function SmallBtn({ children, tone = "default", onClick, disabled }) {
  const variants = {
    default: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-white text-red-600 ring-1 ring-red-200 hover:bg-red-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    primary: "bg-[#325082] text-white hover:bg-[#22365a]",
    ghost: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-3 rounded-md text-sm transition-colors ${variants[tone]} disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

// --- card ---
function RequestCard({ r, onMarkRead, onAccept, onDecline, onRespond }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* listing image */}
        <img
          src={r.listingImage}
          alt={r.listingTitle}
          className="w-16 h-16 rounded-md object-cover ring-1 ring-slate-200"
        />

        <div className="flex-1 min-w-0">
          {/* header line */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="font-semibold text-slate-900">{r.listingTitle}</div>
            <ReadPill unread={r.unread} />
            <span className="ml-auto text-xs text-slate-500">{r.timeAgo}</span>
          </div>

          {/* requester line */}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <img
              src={r.requester.avatar}
              alt={r.requester.name}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
            />
            <span className="font-medium text-slate-900">{r.requester.name}</span>
            <span className="text-slate-500">from {r.requester.campus}</span>
          </div>

          {/* message bubble */}
          <div className="mt-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[15px] text-slate-800">
              “{r.message}”
            </div>
          </div>

          {/* contact + actions */}
          <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {r.contact.type === "email" ? (
                <MailIcon className="w-4 h-4" />
              ) : (
                <PhoneIcon className="w-4 h-4" />
              )}
              <span className="truncate">{r.contact.value}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {r.unread && (
                <SmallBtn tone="ghost" onClick={() => onMarkRead(r.id)}>
                  Mark as Read
                </SmallBtn>
              )}
              {r.status !== "declined" && (
                <SmallBtn tone="danger" onClick={() => onDecline(r.id)}>
                  Decline
                </SmallBtn>
              )}
              {r.status !== "accepted" && (
                <SmallBtn tone="success" onClick={() => onAccept(r.id)}>
                  Accept Request
                </SmallBtn>
              )}
              <SmallBtn tone="primary" onClick={() => onRespond(r.id)}>
                <span className="inline-flex items-center gap-1">
                  <PaperPlane className="w-4 h-4" />
                  Respond
                </span>
              </SmallBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- page ---
export default function DonatorMessagesPage() {
  const [requests, setRequests] = useState(seed);

  const total = useMemo(() => requests.length, [requests]);

  const markRead = (id) =>
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, unread: false } : r))
    );

  const accept = (id) =>
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "accepted", unread: false } : r))
    );

  const decline = (id) =>
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined", unread: false } : r))
    );

  const respond = (id) => {
    const r = requests.find((x) => x.id === id);
    if (!r) return;
    if (r.contact.type === "email") {
      const subject = encodeURIComponent(`Regarding your request: ${r.listingTitle}`);
      const body = encodeURIComponent(
        `Hi ${r.requester.name},\n\nThanks for reaching out about "${r.listingTitle}".\n\n— Sent from TrustLoop`
      );
      window.location.href = `mailto:${r.contact.value}?subject=${subject}&body=${body}`;
    } else {
      const digits = r.contact.value.replace(/[^\d+]/g, "");
      window.location.href = `tel:${digits}`;
    }
  };

  return (
    <>
      <NavBar />
      <main className="max-w-[1100px] mx-auto px-3 py-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#325082]">
            Recent Contact Requests
          </h1>
          <div className="text-xs sm:text-sm text-slate-500">{total} total</div>
        </div>

        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              onMarkRead={markRead}
              onAccept={accept}
              onDecline={decline}
              onRespond={respond}
            />
          ))}
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/my-orders"
            className="text-[#325082] underline underline-offset-2 hover:text-[#22365a]"
          >
            ← Back to My Orders
          </Link>
        </div>
      </main>
    </>
  );
}
