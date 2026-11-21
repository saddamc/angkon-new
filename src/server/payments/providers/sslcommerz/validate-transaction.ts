import { getSslcommerzConfig } from "./config";
import { SslcommerzClient } from "./client";
import type { SslcommerzValidationResponse } from "./types";
import { PaymentError } from "../../payment-errors";

export async function validateSslcommerzTransaction(
  valId: string
): Promise<SslcommerzValidationResponse> {
  const config = getSslcommerzConfig();

  if (!config.isConfigured) {
    throw new PaymentError(
      "SSLCOMMERZ store credentials are not configured.",
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      503
    );
  }

  const cleanValId = String(valId || "").trim();
  if (!cleanValId) {
    throw new PaymentError("Validation ID (val_id) is missing.", "MISSING_VAL_ID", 400);
  }

  const params: Record<string, string> = {
    val_id: cleanValId,
    store_id: config.storeId,
    store_passwd: config.storePasswd,
    format: "json",
  };

  return await SslcommerzClient.getJson<SslcommerzValidationResponse>(
    config.validationUrl,
    params
  );
}
