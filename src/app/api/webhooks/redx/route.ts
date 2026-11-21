import { NextRequest } from "next/server";
import { handleCourierWebhook } from "@/server/courier/webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleCourierWebhook({
    request,
    provider: "redx",
    secretEnvName: "REDX_WEBHOOK_SECRET",
    signatureHeaderNames: ["x-redx-signature", "x-webhook-signature"],
    idKeys: {
      consignment: ["tracking_id", "parcel_id", "consignment_id"],
      tracking: ["tracking_id", "trackingId"],
      order: ["merchant_invoice_id", "invoice_number", "orderNumber"],
    },
  });
}
