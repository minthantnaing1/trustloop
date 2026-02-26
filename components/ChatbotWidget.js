"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/* ======================================================
   Chatbot Logic (Rule-based, No AI, No API)
====================================================== */

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const INTENT_KEYWORDS = {
  GREETING: ["hi", "hello", "hey", "good morning", "good afternoon"],

  BUY: ["buy", "purchase", "get", "want to buy", "looking for"],
  SELL: ["sell", "list", "post", "upload", "put up for sale"],
  PAYMENT: ["pay", "payment", "checkout", "paid", "charge"],
  ORDER: ["order", "my order", "tracking", "delivery", "status"],

  COMPLAINT: [
    "problem",
    "issue",
    "refund",
    "cancel",
    "damaged",
    "broken",
    "wrong item",
    "not received",
  ],

  PROFILE: ["profile", "account", "edit profile", "my info"],

  FAQ: [
    "what is trustloop",
    "is trustloop safe",
    "who can use trustloop",
    "is there a fee",
    "how much is the fee",
    "how do i contact seller",
    "is this only for students",
    "is this only for au",
  ],
};

function detectIntent(message) {
  const text = normalizeText(message);

  // 1️⃣ Greeting
  for (const keyword of INTENT_KEYWORDS.GREETING) {
    if (text === keyword || text.startsWith(keyword)) {
      return "GREETING";
    }
  }

  // 2️⃣ Complaints have priority
  for (const keyword of INTENT_KEYWORDS.COMPLAINT) {
    if (text.includes(keyword)) return "COMPLAINT";
  }

  // 3️⃣ Score-based detection
  let bestIntent = "UNKNOWN";
  let highestScore = 0;

  for (const intent in INTENT_KEYWORDS) {
    if (intent === "GREETING" || intent === "COMPLAINT") continue;

    let score = 0;
    for (const keyword of INTENT_KEYWORDS[intent]) {
      if (text.includes(keyword)) score++;
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  return highestScore > 0 ? bestIntent : "UNKNOWN";
}

function getBotResponse(message) {
  const intent = detectIntent(message);

  switch (intent) {
    case "GREETING":
      return `Hi 👋 I’m the TrustLoop Assistant.

I can help you with:
• Buying items  
• Selling items  
• Payments and orders  
• Common questions about TrustLoop  

Just type what you need help with 😊`;

    case "BUY":
      return `To buy an item on TrustLoop:
1. Go to the Buy & Sell page
2. Browse or search for items
3. Click More Details
4. Review product information
5. Click Buy Now

👉 Go to Buy & Sell: /buy-sell`;

    case "SELL":
      return `To sell an item on TrustLoop:
1. Open the Buy & Sell page
2. Click Sell Your Item
3. Upload product images
4. Enter details and price
5. Submit the listing

👉 Go to Sell page: /buy-sell`;

    case "PAYMENT":
      return `For payments on TrustLoop:
1. Click Buy Now on the product page
2. Complete checkout securely
3. Wait for payment confirmation
4. Check the status in My Orders

👉 Go to My Orders: /my-orders`;

    case "ORDER":
      return `To manage your order:
1. Go to My Orders
2. Select the order
3. Check the current status
4. Follow the instructions shown

👉 Go to My Orders: /my-orders`;

    case "COMPLAINT":
      return `To report a problem:
1. Go to My Orders
2. Select the related order
3. Click the Support button
4. Upload photos and describe the issue
5. Submit for admin review

👉 Go to Support page: /support`;

    case "PROFILE":
      return `To manage your profile:
1. Go to Profile
2. Edit your personal information
3. Save your changes

👉 Go to Profile: /profile`;

    case "FAQ":
      return `Common questions about TrustLoop:

• TrustLoop is a student-only marketplace for Assumption University students  
• Only verified AU students can use the platform  
• TrustLoop charges a small service fee per transaction  
• Buyers and sellers communicate through order details  
• Trust badges help indicate trusted users`;

    default:
      return `I may not be able to help with this request directly.

Here’s what you can do next:
1. Visit the Support page from the main menu
2. Select the related order or issue
3. Submit your concern for admin assistance

👉 Go to Support page: /support`;
  }
}

/* ======================================================
   Chatbot UI Component
====================================================== */

export default function ChatbotWidget() {
  const pathname = usePathname();

  // ❌ Hide chatbot on Home page
  if (pathname === "/" || pathname === "") return null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // 🔹 Load chat history
  useEffect(() => {
    const saved = localStorage.getItem("trustloop_chat_history");
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([
        { role: "bot", text: "Hi! I can guide you on how to use TrustLoop 😊" },
      ]);
    }
  }, []);

  // 🔹 Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        "trustloop_chat_history",
        JSON.stringify(messages)
      );
    }
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    const botReply = getBotResponse(input);

    setMessages((prev) => [...prev, userMsg, { role: "bot", text: botReply }]);
    setInput("");
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "#325082",
          color: "#fff",
          borderRadius: "50%",
          width: 56,
          height: 56,
          fontSize: 24,
          border: "none",
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        💬
      </button>

      {/* Chat Window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 20,
            width: 320,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 12,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: "#325082",
              color: "#fff",
              padding: 10,
              borderRadius: "12px 12px 0 0",
              fontWeight: "bold",
            }}
          >
            TrustLoop Assistant
          </div>

          <div
            style={{
              padding: 10,
              height: 260,
              overflowY: "auto",
              fontSize: 14,
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <b>{m.role === "user" ? "You" : "Bot"}:</b>
                <br />
                {m.text.split("\n").map((line, idx) => (
                  <div key={idx}>
                    {line.startsWith("👉") ? (
                      <a
                        href={line.split(": ")[1]}
                        style={{ color: "#325082", fontWeight: "bold" }}
                      >
                        {line}
                      </a>
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", borderTop: "1px solid #ddd" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to use TrustLoop..."
              style={{
                flex: 1,
                padding: 8,
                border: "none",
                outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "0 14px",
                border: "none",
                background: "#325082",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}