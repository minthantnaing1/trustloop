import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({
        reply: "Please ask about buying, selling, payments, or orders.",
      });
    }

    const systemPrompt = `
You are the TrustLoop AI Chatbot.

Your ONLY task is to give STEP-BY-STEP INSTRUCTIONS on how to use the TrustLoop website.

ALLOWED TOPICS:
- Buying items
- Selling items
- Payments
- Orders
- Profiles

RULES:
- Always respond with numbered steps
- If the user says a single word like "buying" or "selling", explain the steps
- Do NOT say "I can guide you"
- Do NOT redirect to support or admins
- Do NOT refuse unless completely unrelated
`;

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await openaiRes.json();
    console.log("OpenAI response:", JSON.stringify(data, null, 2));

    // 🔴 Handle OpenAI error response (quota, auth, etc.)
    if (data.error) {
      return NextResponse.json({
        reply:
          "The AI assistant is temporarily unavailable. Please try again later.",
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      reply:
        reply ||
        "Ask about buying, selling, payments, or orders on TrustLoop.",
    });
  } catch (err) {
    console.error("Chatbot API error:", err);

    return NextResponse.json({
      reply:
        "I can explain how to use TrustLoop. Please ask about platform features.",
    });
  }
}
