/**
 * Structured security logging.
 *
 * Every event is emitted as a single JSON line prefixed with `[SECURITY]` so it
 * can be picked up by a log drain (Vercel, Cloudflare, Datadog) without a
 * custom parser. Never pass raw IPs, emails, tokens or card data here — pass
 * the already-hashed identifier instead.
 */

export type SecurityEvent =
  | "rate_limit.blocked"
  | "rate_limit.store_error"
  | "rate_limit.degraded_fail_closed"
  | "auth.invalid_credentials"
  | "auth.bruteforce_throttled"
  | "csrf.origin_mismatch"
  | "admin.unauthorized"
  | "admin.forbidden"
  | "payment.verification_rejected"
  | "payment.amount_mismatch"
  | "payment.high_risk"
  | "payment.duplicate_notification"
  | "payment.reconcile_mismatch"
  | "payment.reconciliation_run"
  | "payment.reconciliation_failed"
  | "payment.ipn_processing_failed"
  | "payment.review_note"
  | "webhook.rate_limited";

export interface SecurityLogDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export function securityLog(event: SecurityEvent, details: SecurityLogDetails = {}): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };

  // A single line keeps log drains and `grep` simple.
  try {
    console.warn(`[SECURITY] ${JSON.stringify(entry)}`);
  } catch {
    console.warn(`[SECURITY] ${event}`);
  }
}
