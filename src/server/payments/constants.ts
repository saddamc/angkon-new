export const MAX_PAYMENT_ATTEMPTS = 5;

export const PAYMENT_CONSTANTS = {
  CURRENCY_BDT: "BDT",
  DEFAULT_GATEWAY_TIMEOUT_MS: 15000,
  MAX_RECONCILE_ATTEMPTS: 8,
  
  // Reconcile schedule backoffs in minutes
  BACKOFF_SCHEDULE_MINUTES: [2, 5, 10, 30, 60, 120, 240],
  
  // Inactivity window before an unreturned customer session is queried
  CUSTOMER_INACTIVITY_THRESHOLD_MINUTES: 5,

  // Maximum lifespan of an unresolved session before being marked expired.
  // Configurable through PAYMENT_SESSION_TTL_MINUTES (default 240 minutes).
  SESSION_EXPIRATION_HOURS:
    Number(process.env.PAYMENT_SESSION_TTL_MINUTES) > 0
      ? Number(process.env.PAYMENT_SESSION_TTL_MINUTES) / 60
      : 4,

  // Tolerance in BDT for currency floating-point comparisons
  AMOUNT_TOLERANCE_BDT: 0.01,

  // Risk levels from SSLCOMMERZ
  RISK_LEVEL_SAFE: "0",
  RISK_LEVEL_HIGH: "1",
} as const;

