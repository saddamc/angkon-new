import { NextRequest, NextResponse } from "next/server";
import { requireAdminSessionCore } from "@/server/auth/admin-auth";
import { getOrderNotificationEmails } from "@/lib/email/resend";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response;
  }

  return NextResponse.json(
    {
      orderEmails: getOrderNotificationEmails(),
      senderEmail: (process.env.EMAIL_FROM || "ANGKON Orders <orders@angkon.net>").trim(),
      emailServiceConfigured: Boolean(process.env.RESEND_API_KEY),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
