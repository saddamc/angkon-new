import {
  EmailOrderData,
  getCustomerOrderEmailHtml,
  getAdminOrderEmailHtml,
} from "./templates";

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("⚠️ RESEND_API_KEY is not defined in environment variables. Email skipped.");
    return { success: false, error: "Missing RESEND_API_KEY" };
  }

  const sender = from || process.env.EMAIL_FROM || "ANGKON <noreply@angkon.net>";
  const recipients = Array.isArray(to) ? to : [to];

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender.trim(),
        to: recipients.map((r) => r.trim()).filter(Boolean),
        subject,
        html,
      }),
      signal: AbortSignal.timeout(10000), // 10 second safety timeout
    });

    const data = await res.json();

    if (!res.ok) {
      console.warn("❌ Resend API Error:", data);
      return { success: false, error: data?.message || "Failed to send email" };
    }

    return { success: true, id: data.id };
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
