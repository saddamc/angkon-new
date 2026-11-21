import { PAYMENT_CONSTANTS } from "../constants";

export interface AmountValidationResult {
  isValid: boolean;
  expected: number;
  received: number;
  difference: number;
  reason?: string;
}

/**
 * Validates gateway payment amounts with floating-point tolerance (one cent / 0.01 BDT)
 * to guard against rounding differences while preventing price tampering.
 */
export function validatePaymentAmount(
  expectedAmount: number,
  receivedAmount: number
): AmountValidationResult {
  const exp = Number.isFinite(expectedAmount) ? Math.max(0, expectedAmount) : 0;
  const rec = Number.isFinite(receivedAmount) ? Math.max(0, receivedAmount) : 0;
  const difference = Math.abs(rec - exp);

  if (difference <= PAYMENT_CONSTANTS.AMOUNT_TOLERANCE_BDT) {
    return {
      isValid: true,
      expected: exp,
      received: rec,
      difference,
    };
  }

  return {
    isValid: false,
    expected: exp,
    received: rec,
    difference,
    reason: `Amount mismatch: Expected ৳${exp.toFixed(2)}, received ৳${rec.toFixed(2)} (diff: ৳${difference.toFixed(2)})`,
  };
}

export function isAmountValid(expectedAmount: number, receivedAmount: number): boolean {
  if (expectedAmount < 0 || receivedAmount < 0) return false;
  return validatePaymentAmount(expectedAmount, receivedAmount).isValid;
}

