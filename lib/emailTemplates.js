// lib/emailTemplates.js
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildNotificationEmail({
  recipientName,
  title,
  message,
  link,
}) {
  const safeName = escapeHtml(recipientName || "User");
  const safeTitle = escapeHtml(title || "TrustLoop Notification");
  const safeMessage = escapeHtml(message || "");
  const appBase = process.env.APP_BASE_URL || "";
  const fullLink = link
    ? `${appBase}${link.startsWith("/") ? link : `/${link}`}`
    : appBase;

  const subject = `[TrustLoop] ${title}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f9ff;padding:24px;color:#1f2937;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5ecf8;border-radius:14px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#325082,#49679c);padding:18px 24px;">
          <div style="font-size:24px;font-weight:700;color:#ffffff;">TrustLoop</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.9);margin-top:4px;">
            Buy smart, sell safe — stay in the loop.
          </div>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 14px;font-size:15px;">Hi ${safeName},</p>
          <h2 style="margin:0 0 12px;font-size:20px;color:#325082;">${safeTitle}</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">
            ${safeMessage}
          </p>

          ${
            fullLink
              ? `
            <a
              href="${fullLink}"
              style="display:inline-block;background:#325082;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;"
            >
              View in TrustLoop
            </a>
          `
              : ""
          }

          <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5ecf8;font-size:12px;color:#6b7280;">
            This is an automated TrustLoop email.
          </div>
        </div>
      </div>
    </div>
  `;

  const text = `Hi ${recipientName || "User"},

${title}

${message}

${fullLink ? `Open: ${fullLink}` : ""}

- TrustLoop`;

  return { subject, html, text };
}
