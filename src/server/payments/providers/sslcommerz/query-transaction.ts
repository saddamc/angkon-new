import { getSslcommerzConfig } from "./config";
import { SslcommerzClient } from "./client";
import type { SslcommerzQueryResponse, SslcommerzValidationResponse } from "./types";
import { PaymentError } from "../../payment-errors";

export async function querySslcommerzTransactionByTranId(
  tranId: string
): Promise<SslcommerzValidationResponse | null> {
  const config = getSslcommerzConfig();

  if (!config.isConfigured) {
    throw new PaymentError(
      "SSLCOMMERZ store credentials are not configured.",
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      503
    );
  }

  const cleanTranId = String(tranId || "").trim();
  if (!cleanTranId) {
    throw new PaymentError("Transaction ID (tran_id) is missing.", "MISSING_TRAN_ID", 400);
  }

  const params: Record<string, string> = {
    tran_id: cleanTranId,
    store_id: config.storeId,
    store_passwd: config.storePasswd,
    format: "json",
  };

  const response = await SslcommerzClient.getJson<SslcommerzQueryResponse>(
    config.queryUrl,
    params
  );

  if (!response) return null;

  if (Array.isArray(response.element)) {
    // Filter strictly by the requested tranId
    const matchingElements = response.element.filter(
      (item) => String(item.tran_id || "").trim() === cleanTranId
    );

    if (matchingElements.length === 0) {
      return null;
    }

    // When multiple records exist for this tranId, select the verified/valid one if present
    const validMatch = matchingElements.find(
      (item) => String(item.status || "").trim().toUpperCase() === "VALID" ||
                String(item.status || "").trim().toUpperCase() === "VALIDATED"
    );

    return validMatch || matchingElements[0] || null;
  }

  if (response.element && typeof response.element === "object") {
    if (String(response.element.tran_id || "").trim() === cleanTranId) {
      return response.element;
    }
    return null;
  }

  if ("status" in response) {
    return response as SslcommerzValidationResponse;
  }

  return null;
}
