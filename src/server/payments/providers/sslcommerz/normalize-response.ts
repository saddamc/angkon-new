import type { SslcommerzValidationResponse } from "./types";
import type { NormalizedGatewayResult } from "../../types";
import { mapGatewayStatus } from "../../utils/map-gateway-status";

export function normalizeSslcommerzResponse(
  raw: SslcommerzValidationResponse
): NormalizedGatewayResult {
  const statusMapping = mapGatewayStatus(raw.status);
  const parsedStoreAmount = raw.store_amount !== undefined && raw.store_amount !== ""
    ? parseFloat(String(raw.store_amount))
    : NaN;

  return {
    provider: "sslcommerz",
    tranId: String(raw.tran_id || "").trim(),
    valId: raw.val_id ? String(raw.val_id).trim() : null,
    status: statusMapping.normalized,
    amount: parseFloat(raw.amount || raw.currency_amount || "0"),
    storeAmount: Number.isFinite(parsedStoreAmount) ? parsedStoreAmount : null,
    currency: String(raw.currency_type || raw.currency || "BDT").toUpperCase(),
    tranDate: raw.tran_date ? String(raw.tran_date).trim() : null,
    validatedOn: (raw as { validated_on?: string }).validated_on
      ? String((raw as { validated_on?: string }).validated_on).trim()
      : null,
    bankTranId: raw.bank_tran_id ? String(raw.bank_tran_id).trim() : null,
    cardType: raw.card_type ? String(raw.card_type).trim() : null,
    cardBrand: raw.card_brand ? String(raw.card_brand).trim() : null,
    cardIssuer: raw.card_issuer ? String(raw.card_issuer).trim() : null,
    riskLevel: raw.risk_level !== undefined ? String(raw.risk_level).trim() : null,
    riskTitle: raw.risk_title ? String(raw.risk_title).trim() : null,
    rawResponse: raw as unknown as Record<string, unknown>,
  };
}
