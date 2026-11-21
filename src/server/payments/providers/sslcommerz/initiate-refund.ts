import { getSslcommerzConfig } from "./config";
import { SslcommerzClient } from "./client";
import type { SslcommerzRefundInitiateResponse } from "./types";
import { PaymentError } from "../../payment-errors";

export interface InitiateRefundInput {
  bankTranId: string;
  refundAmount: number;
  refundRemarks: string;
  refundRefId: string; // Internal unique refund reference
}

export async function initiateSslcommerzRefund(
  input: InitiateRefundInput
): Promise<SslcommerzRefundInitiateResponse> {
  const config = getSslcommerzConfig();

  if (!config.isConfigured) {
    throw new PaymentError(
      "SSLCOMMERZ store credentials are not configured.",
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      503
    );
  }

  const cleanBankTranId = input.bankTranId.trim();
  if (!cleanBankTranId) {
    throw new PaymentError("Missing bank_tran_id for refund initiation.", "MISSING_BANK_TRAN_ID", 400);
  }

  if (!input.refundAmount || input.refundAmount <= 0) {
    throw new PaymentError("Refund amount must be greater than zero.", "INVALID_REFUND_AMOUNT", 400);
  }

  const params: Record<string, string> = {
    store_id: config.storeId,
    store_passwd: config.storePasswd,
    bank_tran_id: cleanBankTranId,
    refund_amount: input.refundAmount.toFixed(2),
    refund_remarks: input.refundRemarks.trim().slice(0, 255),
    refe_id: input.refundRefId.trim(),
    format: "json",
  };

  const response = await SslcommerzClient.getJson<SslcommerzRefundInitiateResponse>(
    config.queryUrl,
    params
  );

  if (!response) {
    throw new PaymentError("Empty response from SSLCOMMERZ refund initiation API.", "GATEWAY_TIMEOUT", 504);
  }

  return response;
}
