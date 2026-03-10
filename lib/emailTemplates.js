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
  const safeMessage = escapeHtml(message || "").replaceAll("\n", "<br />");

  const appBase = process.env.APP_BASE_URL || "";
  const fullLink = link
    ? `${appBase}${link.startsWith("/") ? link : `/${link}`}`
    : appBase;

  const subject = `[TrustLoop] ${title}`;

  const html = `
    <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7;padding:24px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #d9e2f0;">
              
              <tr>
                <td style="background:linear-gradient(135deg,#1f2f4c 0%, #325082 55%, #49679c 100%);padding:20px 24px;border-bottom:1px solid #415f94;">
                  <div style="font-size:24px;line-height:1.2;font-weight:700;color:#ffffff;">
                    TrustLoop
                  </div>
                  <div style="margin-top:6px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.9);">
                    Buy smart, sell safe — stay in the loop.
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:24px;">
                  <div style="font-size:15px;line-height:1.7;color:#334155;margin-bottom:14px;">
                    Hi ${safeName},
                  </div>

                  <div style="font-size:20px;line-height:1.35;font-weight:700;color:#27426c;margin-bottom:12px;">
                    ${safeTitle}
                  </div>

                  <div style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:20px;">
                    ${safeMessage}
                  </div>

                  ${
                    fullLink
                      ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
                      <tr>
                        <td style="background:#325082;">
                          <a href="${fullLink}" style="display:inline-block;padding:12px 18px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                            View in TrustLoop
                          </a>
                        </td>
                      </tr>
                    </table>
                  `
                      : ""
                  }

                  <div style="border-top:1px solid #dbe4f0;padding-top:16px;font-size:12px;line-height:1.7;color:#64748b;">
                    This is an automated transactional email from TrustLoop.<br />
                    Please do not reply directly to this message.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const text = `Hi ${recipientName || "User"},

${title}

${message}

${fullLink ? `Open: ${fullLink}` : ""}

This is an automated transactional email from TrustLoop.`;

  return { subject, html, text };
}
