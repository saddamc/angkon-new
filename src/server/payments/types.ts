import { Types } from "mongoose";
import type {
  PaymentAttemptStatus,
  CustomerActivityStatus,
  ReconciliationStatus,
  PaymentProvider,
} from "@/models/PaymentAttempt";

export type {
  PaymentAttemptStatus,
  CustomerActivityStatus,
  ReconciliationStatus,
  PaymentProvider,
};

export interface InitiatePaymentInput {
  orderNumber: string;
  customerIp?: string;
  userAgent?: string;
  idempotencyKey?: string;
  appBaseUrl: string;
  paymentChannel?: string;
}

export interface InitiatePaymentResult {
  ok: boolean;
  status: PaymentAttemptStatus;
  orderNumber: string;
  tranId: string;
  attemptId: string;
  attemptNumber: number;
  total: number;
  currency: string;
  gatewayUrl?: string | null;
  sessionKey?: string | null;
  error?: string;
  errorCode?: string;
  retryAllowed: boolean;
  requiresReconciliation?: boolean;
}

export interface NormalizedGatewayResult {
  provider: "sslcommerz";
  tranId: string;
  valId?: string | null;
  status: "VALID" | "FAILED" | "CANCELLED" | "PENDING" | "UNATTEMPTED" | "EXPIRED" | "ERROR" | "UNKNOWN";
  amount: number;
  storeAmount?: number | null;
  currency: string;
  tranDate?: string | null;
  validatedOn?: string | null;
  bankTranId?: string | null;
  cardType?: string | null;
  cardBrand?: string | null;
  cardIssuer?: string | null;
  riskLevel?: string | null;
  riskTitle?: string | null;
  rawResponse?: Record<string, unknown>;
}

export interface VerificationResult {
  isValid: boolean;
  isTerminal: boolean;
  decision: "succeeded" | "failed" | "cancelled" | "expired" | "review_required" | "pending" | "unknown";
  reason?: string;
  details?: string;
  normalized: NormalizedGatewayResult;
}

export interface FinalizePaymentInput {
  attemptId: string | Types.ObjectId;
  tranId: string;
  valId?: string | null;
  verification: VerificationResult;
  source: string;
  correlationId?: string;
}

export interface FinalizePaymentResult {
  ok: boolean;
  alreadySettled: boolean;
  attemptStatus: PaymentAttemptStatus;
  orderStatus: string;
  orderPaymentStatus: string;
  orderNumber: string;
  requiresManualReview: boolean;
  error?: string;
}

export interface RetryPaymentInput {
  orderNumber: string;
  customerIp?: string;
  userAgent?: string;
  appBaseUrl: string;
}

export interface ReconcileAttemptResult {
  attemptId: string;
  orderNumber: string;
  tranId: string;
  outcome: "settled" | "failed" | "cancelled" | "expired" | "review_required" | "still_pending" | "skipped" | "error";
  reason?: string;
}
