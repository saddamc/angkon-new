import { NextRequest } from "next/server";
import { handleCourierWebhook } from "@/server/courier/webhook-handler";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleCourierWebhook({
    request,
    provider: "ecourier",
    secretEnvName: "ECOURIER_WEBHOOK_SECRET",
    signatureHeaderNames: ["x-ecourier-signature", "x-webhook-signature"],
    idKeys: {
      consignment: ["ID", "id", "ecr", "tracking_id"],
      tracking: ["ecr", "tracking_id", "trackingId"],
      order: ["product_id", "order_id", "orderNumber"],
    },
  });
}
