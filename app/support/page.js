"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

export default function SupportPage() {
  const [category, setCategory] = useState("OTHER");
  const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [pagePath, setPagePath] = useState("");
  useEffect(() => {
    setPagePath(window.location.pathname);
  }, []);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setDone(false);

    if (!subject.trim() || !message.trim()) {
      setError("Please fill subject and message.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          priority,
          subject,
          message,
          meta: { page: pagePath },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to submit");

      setDone(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <div className="max-w-[760px] mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Customer Support</h1>
        <p className="mt-1 text-slate-600">
          Report bugs, chat issues, scams, payment problems, or anything you’re
          stuck on. Admin will review your report.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
        >
          <div className="grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="ACCOUNT">Account</option>
                <option value="PAYMENT">Payment</option>
                <option value="PRODUCT">Product / Listing</option>
                <option value="TRANSACTION">Transaction</option>
                <option value="CHAT">Chat</option>
                <option value="BUG">Bug / Error</option>
                <option value="SCAM_SAFETY">Scam / Safety</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short title of the issue"
                maxLength={120}
                className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain what happened, steps to reproduce, and any IDs (product/transaction/chat) if you have them."
                rows={8}
                maxLength={4000}
                className="border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {error ? (
              <div className="text-sm text-rose-600">{error}</div>
            ) : null}

            {done ? (
              <div className="text-sm text-emerald-600">
                Submitted! Admin will review your report.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl px-4 py-2 font-semibold border border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
