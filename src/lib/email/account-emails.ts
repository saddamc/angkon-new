import { sendEmail } from "./resend";

/* ─── Account emails: verification + password reset ─────────────────────
   Same look as the order emails (maroon header, gold accent, light body). */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout({ heading, body, ctaLabel, ctaUrl, footnote }: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote: string;
}): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background-color:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2d2a26;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f3ee;padding:30px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ebe2d8;">
        <tr><td style="background-color:#400604;padding:32px 24px;text-align:center;border-bottom:3px solid #E1B76F;">
          <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;letter-spacing:5px;color:#E1B76F;font-weight:700;text-transform:uppercase;">ANGKON</h1>
          <p style="margin:6px 0 0;font-size:10px;letter-spacing:3px;color:#cbb18a;text-transform:uppercase;">House of Modern Heritage</p>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h2 style="margin:0 0 14px;font-size:20px;color:#400604;">${escapeHtml(heading)}</h2>
          ${body}
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0;">
            <tr><td style="border-radius:8px;background-color:#400604;">
              <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#E1B76F;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(ctaLabel)}</a>
            </td></tr>
          </table>
          <p style="margin:0 0 6px;font-size:12px;color:#7a6f66;">If the button doesn't work, copy this link into your browser:</p>
          <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${safeUrl}" style="color:#400604;">${safeUrl}</a></p>
          <p style="margin:22px 0 0;font-size:12px;color:#7a6f66;">${footnote}</p>
        </td></tr>
        <tr><td style="background-color:#faf6f1;padding:18px 24px;text-align:center;font-size:11px;color:#9a8f86;border-top:1px solid #ebe2d8;">
          ANGKON · H-93, Road 2, Block-A, Niketan, Gulshan, Dhaka-1212
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  /** "checkout" = account was created automatically with the first order */
  reason: "register" | "checkout" | "resend";
  orderNumber?: string;
}) {
  const name = escapeHtml(params.name || "there");
  const intro =
    params.reason === "checkout"
      ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${name}, thank you for your order${
          params.orderNumber ? ` <strong>#${escapeHtml(params.orderNumber)}</strong>` : ""
        }. We created an ANGKON account for you so you can track this order and check out faster next time.</p>
         <p style="margin:0;font-size:14px;line-height:1.6;">Please confirm your email address. You'll then be able to set a password for your account.</p>`
      : `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Hi ${name}, welcome to ANGKON.</p>
         <p style="margin:0;font-size:14px;line-height:1.6;">Please confirm this is your email address to activate your account and see your full order history.</p>`;

  return sendEmail({
    to: params.to,
    subject: params.reason === "checkout" ? "Confirm your email to access your ANGKON account" : "Confirm your ANGKON email address",
    html: layout({
      heading: "Confirm your email",
      body: intro,
      ctaLabel: "Verify email",
      ctaUrl: params.verifyUrl,
      footnote: "This link expires in 48 hours. If you didn't create an ANGKON account, you can ignore this email.",
    }),
  });
}

export async function sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
  return sendEmail({
    to: params.to,
    subject: "Reset your ANGKON password",
    html: layout({
      heading: "Reset your password",
      body: `<p style="margin:0;font-size:14px;line-height:1.6;">Hi ${escapeHtml(params.name || "there")}, we received a request to set a new password for your ANGKON account.</p>`,
      ctaLabel: "Choose a new password",
      ctaUrl: params.resetUrl,
      footnote: "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your password won't change.",
    }),
  });
}
