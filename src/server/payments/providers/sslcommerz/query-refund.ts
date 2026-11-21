import { getSslcommerzConfig } from "./config";
import { SslcommerzClient } from "./client";
import type { SslcommerzRefundQueryResponse } from "./types";
import { PaymentError } from "../../payment-errors";

export async function querySslcommerzRefund(
  refundRefId: string
): Promise<SslcommerzRefundQueryResponse> {
  const config = getSslcommerzConfig();

  if (!config.isConfigured) {
    throw new PaymentError(
      "SSLCOMMERZ store credentials are not configured.",
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      503
    );
  }

  const cleanRefId = refundRefId.trim();
  if (!cleanRefId) {
    throw new PaymentError("Missing refund_ref_id for refund query.", "MISSING_REFUND_REF_ID", 400);
  }

  const params: Record<string, string> = {
    store_id: config.storeId,
    store_passwd: config.storePasswd,
    refund_ref_id: cleanRefId,
    format: "json",
  };

  const response = await SslcommerzClient.getJson<SslcommerzRefundQueryResponse>(
    config.queryUrl,
    params
  );

  if (!response) {
    throw new PaymentError("Empty response from SSLCOMMERZ refund query API.", "GATEWAY_TIMEOUT", 504);
  }

  return response;
}
