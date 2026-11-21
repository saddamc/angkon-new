/**
 * Pure payment-result checks.
 *
 * Kept free of imports so it can be unit-tested directly (Node's type
 * stripping) and reused by both the return callback and the IPN handler.
 */

export interface SslcommerzResultSnapshot {
  isValid: boolean;
  status: string;
  amount: number;
  currency: string;
  tranId: string;
  valId: string;
  riskLevel?: string | null;
  riskTitle?: string | null;
}

export interface SslcommerzExpectation {
  orderNumber: string;
  amount: number;
  currency?: string;
}

export type SslcommerzDecision =
  | { ok: true; highRisk?: boolean; riskTitle?: string | null }
  | { ok: false; reason: "invalid" | "status" | "tran-id-mismatch" | "amount-mismatch" | "currency-mismatch" };

const VALID_STATUSES = new Set(["VALID", "VALIDATED"]);

export function evaluateSslcommerzResult(
  snapshot: SslcommerzResultSnapshot,
  expected: SslcommerzExpectation
): SslcommerzDecision {
  if (!snapshot.isValid) return { ok: false, reason: "invalid" };

  if (!VALID_STATUSES.has(String(snapshot.status || "").toUpperCase())) {
    return { ok: false, reason: "status" };
  }

  // `tran_id` must be present and must belong to this order.
  if (!snapshot.tranId || snapshot.tranId !== expected.orderNumber) {
    return { ok: false, reason: "tran-id-mismatch" };
  }

  // BDT has no fractional paisa in practice; allow a one-cent tolerance for
  // gateway rounding but never accept a different amount.
  if (!Number.isFinite(snapshot.amount) || Math.abs(snapshot.amount - expected.amount) > 0.01) {
    return { ok: false, reason: "amount-mismatch" };
  }

  const expectedCurrency = (expected.currency || "BDT").toUpperCase();
  const actualCurrency = (snapshot.currency || "BDT").toUpperCase();
  if (actualCurrency !== expectedCurrency) {
    return { ok: false, reason: "currency-mismatch" };
  }

  // Handle risk_level responses: risk_level === "1" indicates high-risk transaction
  if (snapshot.riskLevel === "1") {
    return { ok: true, highRisk: true, riskTitle: snapshot.riskTitle || null };
  }

  return { ok: true };
}
