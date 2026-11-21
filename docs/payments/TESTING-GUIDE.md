# Payment Testing Guide & Test Matrix

This guide documents the automated test suites, execution commands, and test coverage for the ANGKON payment subsystem.

---

## 1. Automated Test Suites Overview

The payment module is validated by 11 unit & integration test suites located under `tests/payments/`:

| Test Suite | File | What It Covers |
|---|---|---|
| **Initiation** | `tests/payments/payment-initiation.test.ts` | Sequential `tranId` generation, amount validation (0.01 tolerance), PII redaction, session key hashing, initial state transitions. |
| **Success** | `tests/payments/payment-success.test.ts` | Server validation logic, amount mismatch rejection, currency mismatch detection, risk level 1 review escalation. |
| **Failure** | `tests/payments/payment-failure.test.ts` | Gateway FAILED mapping, immutability of succeeded payments against late failure callbacks. |
| **Cancellation** | `tests/payments/payment-cancellation.test.ts` | Customer cancellation flow, stock release conditions, terminal state checks. |
| **IPN** | `tests/payments/payment-ipn.test.ts` | Deterministic SHA-256 event fingerprinting, normalization of raw gateway payloads, duplicate webhook idempotency. |
| **Retry** | `tests/payments/payment-retry.test.ts` | Attempt counter suffixes (`-A2`, `-A3`), base order number extraction, retry ceiling enforcement (5 attempts). |
| **Reconciliation** | `tests/payments/payment-reconciliation.test.ts` | Exponential backoff progression (`2m`, `5m`, `10m`, `30m`, `1h`, `2h`, `4h`), expiration thresholds, query matching. |
| **Idempotency** | `tests/payments/payment-idempotency.test.ts` | Race condition resolution, duplicate payment event handling, terminal state protection. |
| **Internet Failure** | `tests/payments/payment-internet-failure.test.ts` | Decoupled `customerActivity` (`no_return_detected`) from status, preventing premature order cancellation on connection drops. |
| **Refunds** | `tests/payments/payment-refund.test.ts` | Refund balance verification, prohibition of non-succeeded refunds, gateway refund status mapping. |
| **Sandbox Simulation** | `tests/payments/payment-sandbox-simulation.test.ts` | Full lifecycle end-to-end verification covering all 16 scenarios. |

---

## 2. Test Execution Commands

### Run Payment Test Suite:
```bash
npm run test:payments
```

### Run Entire Security & Hardening Suite:
```bash
node --test tests/mongodb-rate-limit-and-sslcommerz.test.mjs tests/payment-and-order-hardening.test.mjs tests/payment-reconciliation.test.mjs tests/p4-security-hardening.test.mjs tests/route-security.test.mjs
```

### Run Full Static TypeScript Typecheck:
```bash
npm run typecheck
```

### Run Production Build:
```bash
npm run build
```
