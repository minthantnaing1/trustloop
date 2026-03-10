// lib/email.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAppEmail({ to, subject, html, text, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing");
    return { skipped: true, reason: "missing_api_key" };
  }

  if (!process.env.EMAIL_FROM) {
    console.warn("EMAIL_FROM is missing");
    return { skipped: true, reason: "missing_from" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });

    if (error) {
      console.error("❌ Resend send error:", error);
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch (err) {
    console.error("❌ Resend unexpected error:", err);
    return { ok: false, error: err };
  }
}
