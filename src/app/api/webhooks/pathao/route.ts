import { NextRequest } from "next/server";
import { handleCourierWebhook } from "@/server/courier/webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleCourierWebhook({
    request,
    provider: "pathao",
    secretEnvName: "PATHAO_WEBHOOK_SECRET",
    signatureHeaderNames: ["x-pathao-signature", "x-webhook-signature"],
    idKeys: {
      consignment: ["consignment_id", "consignmentId"],
      tracking: ["tracking_code", "trackingCode"],
      order: ["merchant_order_id", "order_number", "orderNumber"],
    },
  });
}
