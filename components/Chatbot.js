"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* =========================================================
   EASY EDIT SECTION
========================================================= */

const CHATBOT_CONFIG = {
  welcomeMessage:
    "Hi! I'm TrustLoop Assistant. I can help with buy & sell, donation, auction, payment, refund, payout, delivery, and order status questions.",
  fallbackMessage:
    "I'm not fully sure about that yet, but I can explain TrustLoop flows like buy & sell, donation, auction, payment, refund, payout, order status, and support.",
  typingDelay: 350,
  maxSuggestionsPerReply: 3,
};

const QUICK_ACTIONS = [
  { label: "Buy & Sell Flow", value: "buy sell flow" },
  { label: "Donation Flow", value: "donation flow" },
  { label: "Auction Flow", value: "auction flow" },
  { label: "Order Status", value: "order status" },
];

/* =========================================================
   BOT KNOWLEDGE
========================================================= */

const BOT_INTENTS = [
  {
    key: "greeting",
    keywords: [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
    ],
    text: "Hello! I can explain TrustLoop features and flows in more detail, including Buy & Sell, Donation, Auction, Payment, Refund, Payout, and Order Status.\n\nYou can ask things like:\n• how buy sell works\n• donation flow\n• auction winner payment\n• refund after cancellation\n• what each order status means",
    suggestions: ["Buy & Sell Flow", "Auction Flow", "Order Status"],
    route: null,
  },

  {
    key: "buy_sell_flow",
    keywords: [
      "buy sell",
      "buy sell flow",
      "how buy sell works",
      "buy flow",
      "sell flow",
      "how to buy",
      "how to sell",
      "buy item",
      "sell item",
      "checkout flow",
      "post item",
      "post product",
      "buy and sell",
      "marketplace flow",
    ],
    text: "Buy & Sell flow in TrustLoop usually works like this:\n\n1. Seller posts a product.\n2. Buyer opens product details and goes to checkout.\n3. Buyer confirms order and location, then completes payment.\n4. Order becomes paid successfully.\n5. Buyer and seller use fulfillment chat to arrange meetup or delivery.\n6. Seller delivers the item or uploads delivery proof.\n7. Buyer confirms received item.\n8. Admin releases payout to seller.\n\nImportant notes:\n• If buyer cancels after payment, only 95% is refunded and 5% is charged as platform fee.\n• If buyer does not pay before payment deadline, the order can expire and be cancelled.\n• After seller uploads proof, buyer should confirm once item is received.",
    suggestions: ["Buy & Sell Status", "Payment", "Refund"],
    route: "/buy",
  },

  {
    key: "buy_sell_status",
    keywords: [
      "buy sell status",
      "order status buy sell",
      "buy sell transaction status",
      "payment successful",
      "delivery in progress",
      "seller proof uploaded",
      "buyer confirmed",
      "paid out",
      "pending payment",
    ],
    text: "Common Buy & Sell transaction statuses:\n\n• PENDING_PAYMENT → order created, waiting for buyer payment.\n• PAYMENT_SUCCESSFUL → buyer paid successfully.\n• SELLER_ACCEPTED / DELIVERY_IN_PROGRESS → seller is preparing or arranging handoff.\n• SELLER_PROOF_UPLOADED → seller uploaded delivery proof.\n• BUYER_CONFIRMED → buyer confirmed receiving the item.\n• PAID_OUT → admin already released payout to seller.\n• CANCELLED_BY_BUYER / CANCELLED_BY_SELLER → order was cancelled.\n• AUTO_CANCELLED_EXPIRED → payment window expired before payment was completed.\n\nIn simple terms:\nPayment first → delivery / meetup → proof / confirmation → payout.",
    suggestions: ["Buy & Sell Flow", "Payout", "Refund"],
    route: "/my-orders",
  },

  {
    key: "donation_flow",
    keywords: [
      "donation",
      "donation flow",
      "how donation works",
      "donate",
      "donate item",
      "free item",
      "give away",
      "request donation",
      "instant donation",
      "selective donation",
      "donor",
      "recipient",
    ],
    text: "Donation flow in TrustLoop has two main modes:\n\n1. Instant donation:\n• Recipient requests the item.\n• The item is reserved quickly.\n• A donation transaction is created.\n• Donor and recipient arrange meetup or delivery in chat.\n• Donor may upload proof.\n• Recipient confirms received item.\n\n2. Selective donation:\n• Multiple users can request the item before deadline.\n• Donor reviews requests.\n• Donor accepts one recipient.\n• Then transaction opens and both sides arrange handoff.\n\nImportant:\n• No payment is involved in donation.\n• Phone and location are important because the item still needs handoff.\n• Donation still has order tracking and confirmation flow.",
    suggestions: ["Donation Status", "How to donate?", "Order Status"],
    route: "/donation",
  },

  {
    key: "donation_status",
    keywords: [
      "donation status",
      "donation transaction status",
      "awaiting donor",
      "recipient confirmed",
      "donor accepted",
      "donation proof",
    ],
    text: "Common Donation statuses:\n\n• AWAITING_DONOR → donor still needs to review or accept.\n• SELLER_ACCEPTED → donor accepted the recipient.\n• DELIVERY_IN_PROGRESS / meetup arrangement → both sides coordinate handoff.\n• SELLER_PROOF_UPLOADED → donor uploaded proof of delivery / meetup.\n• BUYER_CONFIRMED → recipient confirmed receiving the item.\n\nEven though donation is free, it still follows a proper handoff and confirmation process.",
    suggestions: ["Donation Flow", "Support", "My Orders"],
    route: "/my-orders",
  },

  {
    key: "auction_flow",
    keywords: [
      "auction",
      "auction flow",
      "how auction works",
      "bid",
      "bidding",
      "place bid",
      "auction item",
      "auction winner",
      "winning bidder",
      "auction payment",
      "auction order",
      "auction rules",
    ],
    text: "Auction flow in TrustLoop usually works like this:\n\n1. Seller posts an auction item with starting price and deadline.\n2. Buyers place bids before deadline.\n3. After deadline, the highest valid bidder becomes winner.\n4. Winner gets a payment window.\n5. If winner pays successfully, order continues like normal fulfillment.\n6. Buyer and seller use chat for meetup or delivery.\n7. Seller may upload proof.\n8. Buyer confirms received item.\n9. Admin releases payout to seller.\n\nIf the selected winner does not pay in time:\n• the order can be auto-cancelled,\n• the auction can move to the next eligible bidder,\n• and repeated fake bidding or non-payment may lead to warning, restriction, or ban by admin.",
    suggestions: ["Auction Status", "Bid Rules", "Payment"],
    route: "/auction",
  },

  {
    key: "auction_status",
    keywords: [
      "auction status",
      "auction transaction status",
      "winner assigned",
      "winner advanced",
      "auction unsuccessful",
      "auction winner assigned",
      "auction winner advanced",
      "awaiting payment auction",
    ],
    text: "Important auction-related events / statuses:\n\n• AUCTION_WINNER_ASSIGNED → a bidder was selected as winner.\n• AUCTION_WINNER_ASSIGNED_AUTO → system selected winner automatically after deadline.\n• PENDING_PAYMENT → winner must pay within allowed time.\n• STRIPE_PAYMENT_CONFIRMED / PAYMENT_SUCCESSFUL → winner paid successfully.\n• AUCTION_WINNER_ADVANCED → previous winner failed, next bidder is selected.\n• AUCTION_UNSUCCESSFUL / AUCTION_UNSUCCESSFUL_NO_BIDS → auction ended without successful sale.\n• SELLER_PROOF_UPLOADED → seller uploaded proof after delivery.\n• BUYER_CONFIRMED → winner confirmed receiving item.\n• PAID_OUT → admin released seller payout.\n\nSo auction has two phases:\n1. bidding phase\n2. post-win order / fulfillment phase",
    suggestions: ["Auction Flow", "Bid Rules", "Payout"],
    route: "/auction",
  },

  {
    key: "bid_rules",
    keywords: [
      "bid rules",
      "auction rules",
      "bidding rules",
      "minimum bid",
      "min bid",
      "first bid",
      "can i bid twice",
      "fake bid",
      "warning",
      "ban",
    ],
    text: "Main auction bidding rules:\n\n• First valid bid must be above the required minimum.\n• Each next bid must be higher than the current highest bid based on the auction rule.\n• Bids after deadline are rejected.\n• Highest bidder should not place fake bids.\n• If you win, you are expected to pay within the allowed payment time.\n• If winner does not pay, the auction can move to the next bidder.\n• Repeated non-payment or fake bidding may lead to admin warning, restriction, or ban.\n\nSimple rule: only bid if you truly intend to buy the item.",
    suggestions: ["Auction Flow", "Auction Status", "Support"],
    route: "/auction",
  },

  {
    key: "payment",
    keywords: [
      "payment",
      "pay",
      "checkout",
      "promptpay",
      "paid",
      "transfer",
      "payment proof",
      "stripe",
      "checkout flow",
      "winner payment",
      "pay auction",
      "pay order",
    ],
    text: "Payment in TrustLoop depends on the flow:\n\n• Buy & Sell: buyer checks out and pays after confirming order details.\n• Auction: selected winner pays after being assigned as winner.\n• Donation: no payment is required.\n\nAfter successful payment:\n1. transaction moves forward,\n2. buyer and seller arrange delivery / meetup in chat,\n3. seller may upload proof,\n4. buyer confirms received item,\n5. admin releases payout.\n\nIf payment is not completed in time, the transaction may expire or be cancelled.",
    suggestions: ["Refund", "Order Status", "Auction Flow"],
    route: "/my-orders",
  },

  {
    key: "refund",
    keywords: [
      "refund",
      "refunded",
      "refund status",
      "cancel after payment",
      "buyer cancel after payment",
      "return money",
      "refund policy",
      "95 refund",
      "5 percent",
      "platform fee refund",
    ],
    text: "Refund rule in TrustLoop paid flows:\n\n• If a paid Buy & Sell or Auction transaction is cancelled after payment, admin may process a refund.\n• Buyer refund is typically 95% of the paid amount.\n• 5% is kept as platform fee.\n\nExamples:\n• buyer cancels after payment → refund may be needed.\n• seller cancels after payment → refund may be needed.\n• donation has no payment, so normal refund does not apply.\n\nYou can check refund status from the related order if your transaction was cancelled after payment.",
    suggestions: ["Cancellation", "Payment", "My Orders"],
    route: "/my-orders",
  },

  {
    key: "payout",
    keywords: [
      "payout",
      "paid out",
      "seller payout",
      "admin payout",
      "when seller gets money",
      "release payout",
      "view payout",
    ],
    text: "Seller payout happens after the order is safely completed.\n\nTypical payout flow:\n1. buyer pays,\n2. item is delivered / handed over,\n3. seller may upload proof,\n4. buyer confirms received item,\n5. admin releases payout,\n6. transaction becomes PAID_OUT.\n\nFor paid flows, seller payout is based on seller net amount after platform fee.\nDonation does not use normal seller payout because no money is collected.",
    suggestions: ["Order Status", "Payment", "Buy & Sell Flow"],
    route: "/my-orders",
  },

  {
    key: "delivery_proof",
    keywords: [
      "delivery proof",
      "proof",
      "seller proof",
      "upload proof",
      "proof uploaded",
      "confirm received",
      "buyer confirm",
      "received item",
      "item delivered",
    ],
    text: "Delivery proof is used after the seller or donor has already handed over the item.\n\nTypical proof / confirmation flow:\n• Seller uploads proof images.\n• Buyer sees the proof in order details.\n• Buyer confirms once item is truly received.\n• If buyer does not confirm in time, the system may auto-confirm depending on the transaction rule.\n\nThis helps protect both sides before payout is released.",
    suggestions: ["Order Status", "Payout", "My Orders"],
    route: "/my-orders",
  },

  {
    key: "order_status",
    keywords: [
      "order",
      "my order",
      "track order",
      "tracking",
      "status",
      "transaction",
      "transaction flow",
      "steps",
      "step by step",
      "what does status mean",
      "status meaning",
      "my transaction",
      "order detail",
    ],
    text: "TrustLoop order / transaction statuses usually follow this idea:\n\nPaid flows:\nPENDING_PAYMENT → PAYMENT_SUCCESSFUL → DELIVERY_IN_PROGRESS or SELLER_ACCEPTED → SELLER_PROOF_UPLOADED → BUYER_CONFIRMED → PAID_OUT\n\nPossible side cases:\n• CANCELLED_BY_BUYER\n• CANCELLED_BY_SELLER\n• AUTO_CANCELLED_EXPIRED\n• ADMIN_REFUNDED_BUYER\n\nDonation is similar but without payment.\nAuction first has bidding / winner selection, then continues with the same post-payment fulfillment flow.\n\nYou can open My Orders to see the exact current status of each order.",
    suggestions: ["Buy & Sell Status", "Donation Status", "Auction Status"],
    route: "/my-orders",
  },

  {
    key: "support",
    keywords: [
      "problem",
      "issue",
      "report",
      "support",
      "help",
      "complaint",
      "scam",
      "wrong item",
      "damaged",
      "fake bid",
      "user report",
      "dispute",
      "ban",
      "warning",
    ],
    text: "If you have a problem in TrustLoop:\n\n1. keep screenshots or proof,\n2. keep transaction / order details,\n3. keep payment or refund proof if relevant,\n4. contact support/admin from the support section.\n\nSupport is important for issues like:\n• wrong or damaged item\n• cancellation dispute\n• payment issue\n• suspicious bidding behavior\n• repeated non-payment\n• harassment or misuse in chat",
    suggestions: ["Refund", "Order Status", "Open Support"],
    route: "/support",
  },

  {
    key: "post_item",
    keywords: [
      "how to post",
      "post item",
      "create listing",
      "sell your item",
      "auction your item",
      "donate your item",
      "create product",
      "new listing",
    ],
    text: "To post on TrustLoop, go to the related section first:\n\n• Buy → for normal product selling / requests\n• Donation → for giving items for free\n• Auction → for bidding-based selling\n\nBefore posting, it is better to complete your profile details such as phone, location, and payment-related info if required. Different posting types may need different fields such as price, donation mode, or auction deadline.",
    suggestions: ["Open Buy", "Open Donation", "Open Auction"],
    route: "/sell",
  },

  {
    key: "where_order",
    keywords: [
      "where is my order",
      "where can i see my order",
      "open my order",
      "see order",
      "my orders",
      "order detail page",
    ],
    text: "You can usually check your transaction from My Orders. That page lets you see the current status, fulfillment chat, proof, refund page, payout page, and review page depending on your role and order stage.",
    suggestions: ["Open My Orders", "Order Status"],
    route: "/my-orders",
  },
];

/* =========================================================
   ICONS
========================================================= */

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d="M12 3v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="7"
        width="16"
        height="11"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="12.5" r="1" fill="currentColor" />
      <circle cx="15" cy="12.5" r="1" fill="currentColor" />
      <path
        d="M9.5 15.3c.7.4 1.5.6 2.5.6s1.8-.2 2.5-.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
      <path
        d="M21 3L10 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 3L14 21l-4-7-7-4 18-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreIntent(normalized, intent) {
  let score = 0;

  for (const keyword of intent.keywords) {
    const k = normalizeText(keyword);
    if (!k) continue;

    if (normalized === k) score += 5;
    else if (normalized.includes(k)) score += k.split(" ").length > 1 ? 4 : 2;
  }

  return score;
}

function matchIntent(text) {
  const normalized = normalizeText(text);

  let bestIntent = null;
  let bestScore = 0;

  for (const intent of BOT_INTENTS) {
    const score = scoreIntent(normalized, intent);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  if (bestIntent && bestScore > 0) {
    return {
      text: bestIntent.text,
      suggestions: (bestIntent.suggestions || []).slice(
        0,
        CHATBOT_CONFIG.maxSuggestionsPerReply,
      ),
      route: bestIntent.route || null,
    };
  }

  return {
    text: CHATBOT_CONFIG.fallbackMessage,
    suggestions: QUICK_ACTIONS.slice(0, 3).map((item) => item.label),
    route: null,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Chatbot() {
  const router = useRouter();
  const pathname = usePathname();
  const endRef = useRef(null);

  const [isVisible, setIsVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      text: CHATBOT_CONFIG.welcomeMessage,
      suggestions: ["Buy & Sell Flow", "Donation Flow", "Auction Flow"],
      route: null,
    },
  ]);

  const showButton = useMemo(() => {
    if (!pathname) return false;

    if (pathname === "/" || pathname === "/terms") return false;
    if (pathname.startsWith("/admin")) return false;

    return true;
  }, [pathname]);

  const liftedPaths = ["/sell/post", "/donation/post", "/auction/post"];
  const shouldLift = liftedPaths.some((p) => pathname?.startsWith(p));

  const CLOSE_DURATION = 180;
  const OPEN_TRANSITION =
    "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  const CLOSE_TRANSITION = "transition-all duration-200 ease-out";
  const panelTransition = open ? OPEN_TRANSITION : CLOSE_TRANSITION;

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isTyping]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  if (!showButton) return null;

  function addUserMessage(text) {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: "user",
        text,
      },
    ]);
  }

  function addBotMessage(payload) {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender: "bot",
        text: payload.text,
        suggestions: payload.suggestions || [],
        route: payload.route || null,
      },
    ]);
  }

  function handleBotFlow(text) {
    const reply = matchIntent(text);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(reply);
    }, CHATBOT_CONFIG.typingDelay);
  }

  function handleSend(customText) {
    const text = String(customText || input).trim();
    if (!text) return;

    addUserMessage(text);
    setInput("");
    handleBotFlow(text);
  }

  function handleSuggestionClick(value) {
    handleSend(value);
  }

  function handleRoute(route) {
    if (!route) return;
    setIsVisible(false);

    setTimeout(() => {
      setOpen(false);
      router.push(route);
    }, CLOSE_DURATION);
  }

  function handleClose() {
    setIsVisible(false);
    setTimeout(() => {
      setOpen(false);
    }, CLOSE_DURATION);
  }

  return (
    <div
      className={`fixed right-4 z-[30000] pointer-events-none ${
        shouldLift ? "bottom-23" : "bottom-5"
      }`}
    >
      {/* Floating launcher */}
      <button
        onClick={() => {
          if (!open) setOpen(true);
        }}
        aria-label="Open TrustLoop assistant"
        className={`group absolute bottom-0 right-0 flex h-14 w-14 items-center justify-center overflow-hidden border border-white/10 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${panelTransition} ${
          open
            ? "pointer-events-none scale-75 opacity-0 translate-y-2"
            : "pointer-events-auto scale-100 opacity-100 translate-y-0"
        }`}
        style={{
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, rgba(61,95,152,0.98) 0%, rgba(39,66,108,0.98) 55%, rgba(17,24,39,0.98) 100%)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%)]" />
        <div
          className="absolute inset-[1px] border border-white/10"
          style={{ borderRadius: "17px" }}
        />
        <div className="relative z-10 flex items-center justify-center">
          <BotIcon />
        </div>
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
      </button>

      {/* Chat panel */}
      <div
        className={`relative w-[360px] max-w-[calc(100vw-24px)] overflow-hidden border text-white shadow-[0_28px_80px_rgba(0,0,0,0.35)] ${panelTransition} ${
          open
            ? isVisible
              ? "pointer-events-auto opacity-100 translate-y-0 scale-100"
              : "pointer-events-none opacity-0 translate-y-6 scale-90"
            : "pointer-events-none opacity-0 translate-y-4 scale-95"
        }`}
        style={{
          borderRadius: "20px",
          borderColor: "rgba(255,255,255,0.09)",
          background:
            "linear-gradient(180deg, rgba(18,27,46,0.97) 0%, rgba(19,29,48,0.97) 52%, rgba(13,20,35,0.98) 100%)",
          backdropFilter: "blur(18px)",
          transformOrigin: "bottom right",
        }}
      >
        {/* background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)]" />
          <div className="absolute -left-14 -top-14 h-40 w-40 rounded-full bg-[#4f79bb]/18 blur-3xl" />
          <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-[#325082]/16 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        </div>

        {/* Header */}
        <div className="relative border-b border-white/10 px-4 py-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(61,95,152,0.22),rgba(255,255,255,0.035),rgba(39,66,108,0.18))]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden border border-white/10 text-white shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
                style={{
                  borderRadius: "14px",
                  background:
                    "linear-gradient(135deg, rgba(61,95,152,0.98) 0%, rgba(39,66,108,0.98) 55%, rgba(17,24,39,0.98) 100%)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_38%)]" />
                <div
                  className="absolute inset-[1px] border border-white/10"
                  style={{ borderRadius: "13px" }}
                />
                <div className="relative z-10 flex items-center justify-center">
                  <BotIcon />
                </div>
              </div>

              <div>
                <p className="text-[14px] font-semibold tracking-[0.01em] text-white">
                  TrustLoop Assistant
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />
                  <span className="text-[11px] text-white/60">
                    Live support guidance
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/5 text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white"
              style={{ borderRadius: "12px" }}
              aria-label="Close chatbot"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="relative border-t border-white/5 bg-[linear-gradient(180deg,rgba(34,48,74,0.38)_0%,rgba(24,35,56,0.22)_20%,rgba(255,255,255,0.015)_100%)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(73,103,156,0.18)_0%,rgba(255,255,255,0)_100%)]" />
          <div className="h-[300px] overflow-y-auto px-3.5 py-3.5">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[84%] border px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line transition-all ${
                      msg.sender === "user"
                        ? "border-[#4569a4]/60 text-white shadow-[0_10px_30px_rgba(37,61,99,0.22)]"
                        : "border-white/10 text-white/88 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
                    }`}
                    style={{
                      borderRadius:
                        msg.sender === "user"
                          ? "16px 16px 6px 16px"
                          : "16px 16px 16px 6px",
                      background:
                        msg.sender === "user"
                          ? "linear-gradient(135deg, rgba(72,107,167,0.95) 0%, rgba(50,80,130,0.95) 55%, rgba(32,50,82,0.95) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.04) 100%)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <p>{msg.text}</p>

                    {msg.sender === "bot" &&
                      Array.isArray(msg.suggestions) &&
                      msg.suggestions.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {msg.suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSuggestionClick(s)}
                              className="border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/80 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white/[0.1] hover:text-white"
                              style={{ borderRadius: "10px" }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                    {msg.sender === "bot" && msg.route && (
                      <button
                        onClick={() => handleRoute(msg.route)}
                        className="mt-2.5 inline-flex items-center border border-[#4f79bb]/40 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_12px_30px_rgba(79,121,187,0.18)]"
                        style={{
                          borderRadius: "10px",
                          background:
                            "linear-gradient(135deg, rgba(79,121,187,0.95) 0%, rgba(50,80,130,0.95) 100%)",
                        }}
                      >
                        Open page
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div
                    className="border border-white/10 px-3 py-2"
                    style={{
                      borderRadius: "16px 16px 16px 6px",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.04) 100%)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55 [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0.02)_100%)] px-3.5 py-3 backdrop-blur-xl">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSuggestionClick(action.value)}
                  className="border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-medium text-white/75 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white/[0.08] hover:text-white"
                  style={{ borderRadius: "10px" }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-2 border border-white/10 bg-black/10 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              style={{ borderRadius: "14px" }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Ask TrustLoop..."
                className="h-8 flex-1 bg-transparent px-2 text-[13px] text-white outline-none placeholder:text-white/35"
              />

              <button
                onClick={() => handleSend()}
                className="flex h-9 w-9 items-center justify-center border border-[#4f79bb]/30 text-white shadow-[0_10px_24px_rgba(50,80,130,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(50,80,130,0.3)]"
                style={{
                  borderRadius: "11px",
                  background:
                    "linear-gradient(135deg, rgba(79,121,187,0.98) 0%, rgba(50,80,130,0.98) 60%, rgba(39,66,108,0.98) 100%)",
                }}
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
