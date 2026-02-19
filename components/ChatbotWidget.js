
"use client";

import { useState } from "react";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I can guide you on how to use TrustLoop 😊" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg.text }),
    });

    const data = await res.json();

    setMessages(prev => [
      ...prev,
      { role: "bot", text: data.reply }
    ]);

    setLoading(false);
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
          zIndex: 1000,
        }}
      >
        💬
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 90,
          right: 20,
          width: 320,
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 12,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            background: "#325082",
            color: "#fff",
            padding: 10,
            borderRadius: "12px 12px 0 0",
            fontWeight: "bold"
          }}>
            TrustLoop Assistant
          </div>

          <div style={{
            padding: 10,
            height: 260,
            overflowY: "auto",
            fontSize: 14
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <b>{m.role === "user" ? "You" : "Bot"}:</b><br />
                {m.text}
              </div>
            ))}
            {loading && <i>Typing...</i>}
          </div>

          <div style={{ display: "flex", borderTop: "1px solid #ddd" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask how to use TrustLoop..."
              style={{
                flex: 1,
                padding: 8,
                border: "none",
                outline: "none"
              }}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "0 14px",
                border: "none",
                background: "#325082",
                color: "#fff",
                cursor: "pointer"
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
