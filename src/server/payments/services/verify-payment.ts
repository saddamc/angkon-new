import type { NormalizedGatewayResult, VerificationResult } from "../types";
import { validatePaymentAmount } from "../utils/validate-amount";
import { extractOrderNumberFromTranId } from "../utils/generate-tran-id";
import { PAYMENT_CONSTANTS } from "../constants";
import { validateSslcommerzTransaction } from "../providers/sslcommerz/validate-transaction";
import { normalizeSslcommerzResponse } from "../providers/sslcommerz/normalize-response";
import { getAppEnvironment } from "@/server/env/app-environment";

export class VerifyPaymentService {
  public static verifyResult(args: {
    expectedOrderNumber: string;
    expectedAmount: number;
    expectedCurrency?: string;
    attemptEnvironment?: "sandbox" | "live";
    isProduction?: boolean;
    normalized: NormalizedGatewayResult;
  }): VerificationResult {
    const { normalized } = args;

    const isProd =
      typeof args.isProduction === "boolean"
        ? args.isProduction
        : getAppEnvironment() === "production";

    // Enforce Sandbox Containment: Sandbox payments can NEVER fulfill an order in Production
    if (isProd && args.attemptEnvironment === "sandbox") {
      return {
        isValid: false,
        isTerminal: true,
        decision: "failed",
        reason: "sandbox_rejected_in_production",
        details: "Sandbox payment cannot fulfill an order in Production environment.",
        normalized,
      };
    }

    // 1. Terminal non-success statuses from gateway
    if (normalized.status === "FAILED") {
      return {
        isValid: false,
        isTerminal: true,
        decision: "failed",
        reason: "gateway_reported_failed",
        normalized,
      };
    }

    if (normalized.status === "CANCELLED") {
      return {
        isValid: false,
        isTerminal: true,
        decision: "cancelled",
        reason: "gateway_reported_cancelled",
        normalized,
      };
    }

    if (normalized.status === "EXPIRED") {
      return {
        isValid: false,
        isTerminal: true,
        decision: "expired",
        reason: "gateway_reported_expired",
        normalized,
      };
    }

    if (normalized.status === "PENDING" || normalized.status === "UNATTEMPTED") {
      return {
        isValid: false,
        isTerminal: false,
        decision: "pending",
        reason: "gateway_transaction_pending",
        normalized,
      };
    }

    if (normalized.status !== "VALID") {
      return {
        isValid: false,
        isTerminal: false,
        decision: "unknown",
        reason: `unsupported_gateway_status_${normalized.status}`,
        normalized,
      };
    }

    // 2. Gateway reports VALID. Now strictly verify matching criteria:
    const tranBaseOrder = extractOrderNumberFromTranId(normalized.tranId);
    if (!normalized.tranId || tranBaseOrder !== args.expectedOrderNumber.trim()) {
      return {
        isValid: false,
        isTerminal: false,
        decision: "review_required",
        reason: "tran_id_mismatch",
        details: `Gateway tran_id "${normalized.tranId}" does not match order "${args.expectedOrderNumber}"`,
        normalized,
      };
    }

    // Verify Amount
    const amountCheck = validatePaymentAmount(args.expectedAmount, normalized.amount);
    if (!amountCheck.isValid) {
      return {
        isValid: false,
        isTerminal: false,
        decision: "review_required",
        reason: "amount_mismatch",
        details: amountCheck.reason,
        normalized,
      };
    }

    // Verify Currency
    const expectedCurrency = (args.expectedCurrency || PAYMENT_CONSTANTS.CURRENCY_BDT).toUpperCase();
    const actualCurrency = (normalized.currency || PAYMENT_CONSTANTS.CURRENCY_BDT).toUpperCase();
    if (actualCurrency !== expectedCurrency) {
      return {
        isValid: false,
        isTerminal: false,
        decision: "review_required",
        reason: "currency_mismatch",
        details: `Expected currency ${expectedCurrency}, got ${actualCurrency}`,
        normalized,
      };
    }

    // Check Risk Level
    if (normalized.riskLevel === PAYMENT_CONSTANTS.RISK_LEVEL_HIGH) {
      return {
        isValid: true,
        isTerminal: true,
        decision: "review_required",
        reason: "high_risk_flagged",
        details: normalized.riskTitle || "Transaction flagged high-risk by gateway",
        normalized,
      };
    }

    // Fully verified and safe!
    return {
      isValid: true,
      isTerminal: true,
      decision: "succeeded",
      normalized,
    };
  }

  /**
   * Validates a failure / cancellation notification through the official
   * validator API.
   *
   * A public callback or IPN must never trust `status=FAILED` by itself:
   * without this check anyone who guesses a transaction id could cancel a
   * legitimate pending order. An unverifiable failure is simply ignored and
   * left to reconciliation.
   */
  public static async verifyFailureNotification(args: {
    valId?: string | null;
    expectedTranId: string;
  }): Promise<{
    ok: boolean;
    reason?: string;
    normalized?: NormalizedGatewayResult;
  }> {
    const valId = String(args.valId || "").trim();
    if (!valId) {
      return { ok: false, reason: "missing-val-id" };
    }

    let normalized: NormalizedGatewayResult;
    try {
      const raw = await validateSslcommerzTransaction(valId);
      normalized = normalizeSslcommerzResponse(raw);
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? `validator-unavailable:${err.message}` : "validator-unavailable",
      };
    }

    if (!normalized.tranId || normalized.tranId !== args.expectedTranId) {
      return { ok: false, reason: "tran-id-mismatch", normalized };
    }

    if (
      normalized.status !== "FAILED" &&
      normalized.status !== "CANCELLED" &&
      normalized.status !== "EXPIRED"
    ) {
      return { ok: false, reason: "status-not-failed", normalized };
    }

    return { ok: true, normalized };
  }
}
