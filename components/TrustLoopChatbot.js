"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

// ✅ Change this ONE value to match your existing support page route
const SUPPORT_PATH = "/support";

// Small helper
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export default function TrustLoopChatbot() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "bot",
      text: "Hi! I’m TrustLoop Help 🤝 What do you need?",
    },
  ]);

  const listRef = useRef(null);

  // Auto scroll to bottom on new message/open
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  // Suggested Q&A (buttons)
  const quickQuestions = useMemo(
    () => [
      "How to sell an item?",
      "How to buy safely?",
      "How do auctions work?",
      "How to hide/unhide my post?",
      "Where is my order detail?",
      "How to contact support?",
    ],
    [],
  );

  // Simple intent rules (fast, reliable)
  const rules = useMemo(
    () => [
      {
        keys: ["sell", "selling", "post", "listing", "list item"],
        answer:
          "To sell: go to Buy & Sell → tap “Sell Your Items” → fill product info → upload images → publish. You can later edit or hide the post from your product details.",
      },
      {
        keys: ["buy", "purchase", "how to buy", "safe", "safely", "scam"],
        answer:
          "To buy safely: check seller profile + ratings, confirm item condition, use in-app transaction flow, and meet in a safe public place on campus. Avoid paying outside the agreed flow.",
      },
      {
        keys: ["auction", "bid", "bidding", "win"],
        answer:
          "Auctions: place bids before the end time. Highest bid at the deadline wins. After winning, you’ll see next steps in your transaction/order detail.",
      },
      {
        keys: ["hide", "unhide", "hidden", "visibility"],
        answer:
          "To hide/unhide: on the Buy & Sell page, tap the eye icon (or open product detail) → confirm → the post becomes hidden/visible without deleting it.",
      },
      {
        keys: ["order", "transaction", "order detail", "delivery", "status"],
        answer:
          "Order/transaction details are in your Orders/Transactions page. Open an order to see timeline, chat, payment proof, and status updates.",
      },
      {
        keys: ["support", "help", "ticket", "contact"],
        answer:
          "If you need help from our team, I can take you to Support and pre-fill your info.",
        action: "support",
      },
    ],
    [],
  );

  function botFallback() {
    return (
      "Hmm, I’m not sure about that yet. " +
      "Please open a Support ticket so our team can help you quickly."
    );
  }

  function matchRule(userText) {
    const t = normalize(userText);
    if (!t) return null;

    // Basic matches: contains any keyword
    for (const r of rules) {
      if (r.keys.some((k) => t.includes(k))) return r;
    }

    // Extra common patterns (optional)
    if (t.includes("refund") || t.includes("money back") || t.includes("scammed")) {
      return {
        answer:
          "For refunds/disputes, please open a Support ticket and include your order/transaction ID, screenshots, and what happened.",
        action: "support",
      };
    }

    return null;
  }

  function pushMessage(role, text) {
    setMessages((prev) => [...prev, { role, text }]);
  }

  function goSupport(prefillText) {
    // ✅ Pass context via query params to prefill the support form
    // Example: /support?from=/buy-sell/123&msg=...
    const qs = new URLSearchParams();
    qs.set("from", pathname || "/");
    if (prefillText) qs.set("msg", prefillText);

    router.push(`${SUPPORT_PATH}?${qs.toString()}`);
  }

  function handleAsk(text) {
    const userText = (text ?? input).trim();
    if (!userText) return;

    pushMessage("user", userText);
    setInput("");

    const rule = matchRule(userText);
    if (rule) {
      pushMessage("bot", rule.answer);

      // If this rule should redirect
      if (rule.action === "support") {
        pushMessage(
          "bot",
          "Want me to open the Support page for you? I’ll include this message.",
        );
      }
      return;
    }

    pushMessage("bot", botFallback());
    pushMessage("bot", "Open Support and I’ll include your message for the team.");
  }

  function onSend(e) {
    e?.preventDefault?.();
    handleAsk();
  }

  // If user typed something unknown, show CTA to Support
  const lastBotMessage = [...messages].reverse().find((m) => m.role === "bot")?.text || "";
  const shouldShowSupportCTA =
    lastBotMessage.toLowerCase().includes("support") ||
    lastBotMessage.toLowerCase().includes("not sure");

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[70] rounded-full shadow-lg bg-[#325082] text-white p-3 hover:opacity-95 active:scale-[0.99]"
          aria-label="Open TrustLoop Help"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-[70] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#325082] text-white">
            <div className="flex items-center gap-2">
              <QuestionMarkCircleIcon className="w-5 h-5" />
              <div className="font-semibold">TrustLoop Help</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md hover:bg-white/10"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="h-[320px] overflow-y-auto px-3 py-3 bg-slate-50"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`mb-2 flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-[#325082] text-white rounded-br-md"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Quick question chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Support CTA */}
            {shouldShowSupportCTA && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    const lastUser = [...messages]
                      .reverse()
                      .find((m) => m.role === "user")?.text;
                    goSupport(lastUser || "");
                  }}
                  className="w-full rounded-xl px-3 py-2 text-sm font-medium bg-slate-900 text-white hover:opacity-95"
                >
                  Open Support Page
                </button>
                <div className="mt-2 text-xs text-slate-500">
                  We’ll include your last message for faster help.
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSend} className="p-3 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                type="submit"
                className="rounded-xl px-3 py-2 bg-[#325082] text-white hover:opacity-95"
                aria-label="Send"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Optional direct link */}
            <div className="mt-2 text-xs text-slate-500">
              Or go directly to{" "}
              <Link className="underline" href={SUPPORT_PATH}>
                Support
              </Link>
              .
            </div>
          </form>
        </div>
      )}
    </>
  );
}
