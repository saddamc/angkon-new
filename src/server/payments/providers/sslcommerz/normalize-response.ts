import type { SslcommerzValidationResponse } from "./types";
import type { NormalizedGatewayResult } from "../../types";
import { mapGatewayStatus } from "../../utils/map-gateway-status";

export function normalizeSslcommerzResponse(
  raw: SslcommerzValidationResponse
): NormalizedGatewayResult {
  const statusMapping = mapGatewayStatus(raw.status);

  return {
    provider: "sslcommerz",
    tranId: String(raw.tran_id || "").trim(),
    valId: raw.val_id ? String(raw.val_id).trim() : null,
    status: statusMapping.normalized,
    amount: parseFloat(raw.amount || raw.currency_amount || "0"),
    currency: String(raw.currency_type || raw.currency || "BDT").toUpperCase(),
    bankTranId: raw.bank_tran_id ? String(raw.bank_tran_id).trim() : null,
    cardType: raw.card_type ? String(raw.card_type).trim() : null,
    cardBrand: raw.card_brand ? String(raw.card_brand).trim() : null,
    riskLevel: raw.risk_level !== undefined ? String(raw.risk_level).trim() : null,
    riskTitle: raw.risk_title ? String(raw.risk_title).trim() : null,
    rawResponse: raw as unknown as Record<string, unknown>,
  };
}
