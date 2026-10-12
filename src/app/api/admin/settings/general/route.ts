import { NextResponse } from "next/server";
import { getOrderNotificationEmails } from "@/lib/email/resend";

// GET /api/admin/settings/general — read-only view of the email setup taken from the
// server environment (ADMIN_EMAIL / EMAIL_FROM). Auth is enforced by src/proxy.ts.
export async function GET() {
  return NextResponse.json(
    {
      orderEmails: getOrderNotificationEmails(),
      senderEmail: (process.env.EMAIL_FROM || "ANGKON <noreply@angkon.net>").trim(),
      emailServiceConfigured: Boolean(process.env.RESEND_API_KEY),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
