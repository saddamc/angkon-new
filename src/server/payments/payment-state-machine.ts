import type {
  PaymentAttemptStatus,
  CustomerActivityStatus,
  ReconciliationStatus,
} from "./types";

/**
 * Enterprise Payment State Machine.
 *
 * Enforces strict, deterministic status transitions across the 3 independent dimensions:
 * 1. Payment Attempt Status (lifecycle of the financial charge)
 * 2. Customer Activity Status (browser journey & presence)
 * 3. Reconciliation Status (background watchdog lifecycle)
 */

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentAttemptStatus>([
  "succeeded",
  "refunded",
]);

/**
 * Legacy statuses written before the centralized module existed.
 *
 * The `payments` collection is shared by the historical `Payment` schema and
 * the new `PaymentAttempt` schema. Old rows use `paid` / `initiated`; the new
 * state machine uses `succeeded` / `pending`. Normalizing on every read keeps
 * both generations interoperable while the data migration runs.
 */
const LEGACY_STATUS_ALIASES: Record<string, PaymentAttemptStatus> = {
  paid: "succeeded",
  initiated: "pending",
};

export function normalizePaymentStatus(
  status: PaymentAttemptStatus | string | null | undefined
): PaymentAttemptStatus {
  if (!status) return "unknown";
  return LEGACY_STATUS_ALIASES[status] || (status as PaymentAttemptStatus);
}

export function isSuccessfulStatus(status: PaymentAttemptStatus | string | null | undefined): boolean {
  return normalizePaymentStatus(status) === "succeeded";
}

const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentAttemptStatus, PaymentAttemptStatus[]> = {
  created: ["initiating", "failed", "cancelled", "expired", "unknown"],
  initiating: ["pending", "failed", "unknown", "cancelled", "expired"],
  pending: [
    "succeeded",
    "failed",
    "cancelled",
    "expired",
    "unknown",
    "review_required",
  ],
  unknown: [
    "pending",
    "succeeded",
    "failed",
    "cancelled",
    "expired",
    "review_required",
  ],
  review_required: ["succeeded", "failed", "cancelled", "refunded"],
  failed: ["failed"], // terminal for this attempt; customer retries create a new attempt
  cancelled: ["cancelled"],       // terminal for this attempt
  expired: ["expired"],           // terminal for this attempt
  succeeded: ["refunded", "partially_refunded"], // Can NEVER be downgraded to failed or cancelled
  refunded: ["refunded"],
  partially_refunded: ["refunded", "partially_refunded"],
};

export class PaymentStateMachine {
  /**
   * Evaluates whether a requested payment state transition is logically permitted.
   */
  public static canTransition(
    current: PaymentAttemptStatus | string,
    target: PaymentAttemptStatus | string
  ): boolean {
    const currentStatus = normalizePaymentStatus(current);
    const targetStatus = normalizePaymentStatus(target);

    // Idempotent self-transition is always allowed
    if (currentStatus === targetStatus) return true;

    // Succeeded state is immutable against failures and cancellations
    if (
      currentStatus === "succeeded" &&
      (targetStatus === "failed" ||
        targetStatus === "cancelled" ||
        targetStatus === "expired" ||
        targetStatus === "unknown")
    ) {
      return false;
    }

    const allowedTargets = ALLOWED_PAYMENT_TRANSITIONS[currentStatus] || [];
    return allowedTargets.includes(targetStatus);
  }

  /**
   * Asserts that a state transition is valid, throwing an error if illegal.
   */
  public static assertTransition(
    current: PaymentAttemptStatus,
    target: PaymentAttemptStatus
  ): void {
    if (!this.canTransition(current, target)) {
      throw new Error(
        `Illegal payment state transition from "${current}" to "${target}".`
      );
    }
  }

  /**
   * Decides next reconciliation status based on attempt status and risk.
   */
  public static resolveReconciliationStatus(
    paymentStatus: PaymentAttemptStatus | string,
    hasRiskOrMismatch: boolean = false
  ): ReconciliationStatus {
    const normalized = normalizePaymentStatus(paymentStatus);

    if (hasRiskOrMismatch || normalized === "review_required") {
      return "manual_review";
    }

    if (normalized === "pending" || normalized === "unknown") {
      return "scheduled";
    }

    if (TERMINAL_PAYMENT_STATUSES.has(normalized)) {
      return "resolved";
    }

    return "not_required";
  }

  /**
   * Determines if an attempt status is terminal and cannot receive additional gateway charges.
   */
  public static isTerminal(status: PaymentAttemptStatus | string): boolean {
    const normalized = normalizePaymentStatus(status);
    return (
      normalized === "succeeded" ||
      normalized === "failed" ||
      normalized === "cancelled" ||
      normalized === "expired" ||
      normalized === "refunded" ||
      normalized === "partially_refunded"
    );
  }

  /**
   * Determines if a customer is allowed to start a fresh payment attempt for an order.
   */
  public static isRetryPermitted(lastStatus?: PaymentAttemptStatus | string): boolean {
    if (!lastStatus) return true;
    const normalized = normalizePaymentStatus(lastStatus);
    return (
      normalized === "failed" ||
      normalized === "cancelled" ||
      normalized === "expired"
    );
  }
}
