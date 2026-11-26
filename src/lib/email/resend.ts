import https from "node:https";
import {
  EmailOrderData,
  getCustomerOrderEmailHtml,
  getAdminOrderEmailHtml,
} from "./templates";
import { getAppEnvironment } from "@/server/env/app-environment";

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string | string[];
}

function sanitizeEnvValue(val?: string | null): string {
  return (val || "").trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Posts JSON to Resend over IPv4 (`family: 4`) to prevent Node 22/24 `fetch`
 * IPv6 connection stalls inside IPv4-only Docker bridge networks (Coolify/VPS).
 */
function postResendOnce(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000
): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(RESEND_API_URL);

    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        family: 4,
        agent: false,
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "angkon-store/1.0",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
          } catch {
            parsed = { message: raw || `HTTP ${res.statusCode || 500}` };
          }
          resolve({ status: res.statusCode || 500, data: parsed });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Resend API request timed out after ${timeoutMs}ms`));
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

async function postResendJson(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = 8000
): Promise<{ status: number; data: Record<string, unknown> }> {
  try {
    return await postResendOnce(apiKey, payload, timeoutMs);
  } catch {
    return await postResendOnce(apiKey, payload, timeoutMs);
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
}: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const appEnv = getAppEnvironment();

  // Test environment: strictly mock without external network calls
  if (appEnv === "test") {
    return { success: true, id: `test_mock_${Date.now()}` };
  }

  let recipients = Array.isArray(to) ? to : [to];
  let emailSubject = subject;
  const realEmailEnabled = sanitizeEnvValue(process.env.ENABLE_REAL_EMAIL).toLowerCase() === "true";

  // Development & Preview: Prevent accidental customer emails unless explicitly enabled
  if (appEnv !== "production" && !realEmailEnabled) {
    const safeRedirect = sanitizeEnvValue(process.env.SAFE_TEST_EMAIL);
    if (!safeRedirect) {
      console.info(
        `[Email Mock (${appEnv})] Non-production email delivery suppressed. To: ${recipients.join(", ")} | Subject: "${subject}"`
      );
      return { success: true, id: `mock_${appEnv}_${Date.now()}` };
    }
    recipients = [safeRedirect];
    emailSubject = `[${appEnv.toUpperCase()} TEST - For: ${Array.isArray(to) ? to.join(",") : to}] ${subject}`;
  }

  const apiKey = sanitizeEnvValue(process.env.RESEND_API_KEY);

  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not defined in environment variables. Email skipped.");
    return { success: false, error: "Missing RESEND_API_KEY" };
  }

  // Use a human-replyable address by default. A no-reply sender reduces trust
  // and prevents customers from replying when they need order support.
  const sender = sanitizeEnvValue(from || process.env.EMAIL_FROM) || "ANGKON Orders <orders@angkon.net>";
  const rawReplyTo = Array.isArray(replyTo)
    ? replyTo.map((r) => sanitizeEnvValue(r)).filter(Boolean)
    : sanitizeEnvValue(replyTo || process.env.EMAIL_REPLY_TO);
  const configuredReplyTo =
    Array.isArray(rawReplyTo) ? (rawReplyTo.length ? rawReplyTo : undefined) : rawReplyTo || undefined;

  try {
    const { status, data } = await postResendJson(apiKey, {
      from: sender,
      to: recipients.map((r) => r.trim()).filter(Boolean),
      subject: emailSubject,
      html,
      ...(configuredReplyTo ? { reply_to: configuredReplyTo } : {}),
    });

    if (status < 200 || status >= 300) {
      console.warn("❌ Resend API Error:", status, data);
      const errMsg = typeof data?.message === "string" ? data.message : `Resend rejected email (HTTP ${status})`;
      return { success: false, error: errMsg };
    }

    return { success: true, id: typeof data?.id === "string" ? data.id : undefined };
  } catch (error) {
    console.error("❌ Email transmission error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function sendOrderConfirmationEmails(
  order: EmailOrderData
): Promise<{ customerSent: boolean; adminSent: boolean }> {
  let customerSent = false;
  let adminSent = false;

  // 1. Send Customer Confirmation (if email is provided)
  const customerEmail = (order.customer.email || "").trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (customerEmail && emailRegex.test(customerEmail)) {
    try {
      const customerHtml = getCustomerOrderEmailHtml(order);
      const res = await sendEmail({
        to: customerEmail,
        subject: `Your ANGKON Order Confirmation #${order.orderNumber}`,
        html: customerHtml,
      });
      if (res.success) {
        customerSent = true;
        console.log(`✅ Customer confirmation email dispatched to ${customerEmail} (ID: ${res.id})`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to send customer confirmation to ${customerEmail}:`, err);
    }
  }

  // 2. Send Admin Alert (configured in .env)
  const adminRecipients = getOrderNotificationEmails();
  if (adminRecipients.length === 0) {
    console.warn("⚠️ ADMIN_EMAIL is not set (or has no valid address). Order alert skipped.");
  }

  if (adminRecipients.length > 0) {
    try {
      const adminHtml = getAdminOrderEmailHtml(order);
      const res = await sendEmail({
        to: adminRecipients,
        subject: `[New Order Alert] #${order.orderNumber} - ${order.customer.fullName} (৳${order.total})`,
        html: adminHtml,
      });
      if (res.success) {
        adminSent = true;
        console.log(`✅ Admin order alert dispatched to ${adminRecipients.join(", ")} (ID: ${res.id})`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to send admin alert to ${adminRecipients.join(", ")}:`, err);
    }
  }

  return { customerSent, adminSent };
}

/** Where new-order alerts go: the comma-separated `ADMIN_EMAIL` env var (valid addresses only). */
export function getOrderNotificationEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}
