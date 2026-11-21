# Scheduled Payment Reconciliation Specification

This document details the architecture, schedules, and algorithms of the background payment watchdog that reconciles unsettled transactions.

---

## 1. Objectives

The Payment Reconciler guarantees that:
1. No customer who paid is left in `pending` because of a dropped connection or closed browser.
2. No inventory remains locked indefinitely for abandoned checkout attempts.
3. Network blips between ANGKON and SSLCOMMERZ heal automatically without manual developer intervention.

---

## 2. Inactivity Threshold & Qualification

A payment attempt qualifies for reconciliation when:
1. Its status is `pending`, `initiating`, or `unknown`.
2. Its `reconciliationStatus` is not `resolved`.
3. Its `nextCheckAt` is less than or equal to current time, **OR** it has had no activity for **5 minutes** (`CUSTOMER_INACTIVITY_THRESHOLD_MINUTES`).

---

## 3. Exponential Backoff Schedule

Rather than hammering the gateway with repeated queries every minute, the reconciler applies an exponential backoff schedule:

| Attempt # | Delay Added | Total Inactivity Elapsed |
|:---:|:---:|:---:|
| **1** | +2 minutes | ~7 minutes |
| **2** | +5 minutes | ~12 minutes |
| **3** | +10 minutes | ~22 minutes |
| **4** | +30 minutes | ~52 minutes |
| **5** | +60 minutes | ~1 hour 52 minutes |
| **6** | +120 minutes | ~3 hours 52 minutes |
| **7** | +240 minutes | ~7 hours 52 minutes |

If an attempt exceeds **8 reconciliation attempts** (`MAX_RECONCILE_ATTEMPTS`):
- Attempt transitions to `reconciliationStatus: "manual_review"`.
- Emits `reconciliation_failed` event into `PaymentEvent`.
- Triggers alert for store administrator review.

---

## 4. Gateway Query Matching Algorithm

When querying SSLCOMMERZ via `/validator/api/merchantTransIDvalidationAPI.php`:
1. The gateway returns an array of transaction elements or a single object.
2. The reconciler filters strictly by `cleanTranId = attempt.tranId.trim()`.
3. If multiple transactions match (e.g. repeated payment submissions):
   - Prioritizes transactions with `status === "VALID"` or `"VALIDATED"`.
   - Never blindly accepts the first array element if `tran_id` does not match.
4. If a matching `VALID` entry is found:
   - Validates `val_id` via server validation.
   - Settles order to `paid`.
   - Marks attempt `succeeded` and reconciliation status `resolved`.
5. If the gateway explicitly returns `FAILED` or `CANCELLED`:
   - Transitions attempt to `failed` or `cancelled`.
   - Releases stock reservation.
   - Marks reconciliation status `resolved`.

---

## 5. Session Expiration Policy

If a session is older than **4 hours** (`SESSION_EXPIRATION_HOURS`) and SSLCOMMERZ returns `UNATTEMPTED` or no transaction record:
- Attempt transitions to `expired`.
- `customerActivity` marked as `no_return_detected`.
- `reconciliationStatus` marked as `resolved`.
- Reserved inventory released back to product stock.

---

## 6. Execution Trigger

The reconciler job is triggered via:
- Endpoint: `POST /api/payments/reconcile` (or `GET /api/payments/reconcile`)
- Authentication: `Bearer <CRON_SECRET>` header or admin session.

---

## Dry-run inspection (`?dryRun=1`)

`GET /api/payments/reconcile?dryRun=1` is strictly read-only: it does not query
the gateway and does not write to MongoDB. Counters describe the **queue**, not
the whole payments collection:

| Counter | Meaning |
|---|---|
| `scanned` | Unresolved attempts in the queue (`created`, `initiated`, `initiating`, `pending`, `unknown`, `review_required`) |
| `eligible` | Queue records a real run would process now (due `nextCheckAt`, has a `tranId`, not already resolved) |
| `pending` | Queue records not due yet; they stay queued and are never marked failed |
| `skipped` | Queue records that cannot be reconciled: no `tranId`, or `reconciliationStatus = resolved` |
| `failed` | Actual notification-processing failures still retryable (`PaymentWebhookInbox.processingStatus = failed`) |
| `failedWebhooks` | Same set, exposed explicitly |
| `retryableFailedWebhooks` | Failed notifications still below the retry cap |
| `terminalFailed` | Historical terminal `failed` attempts — informational only, never part of `failed` |
| `terminalExpired` | Historical terminal `expired` attempts — informational only |

Invariant: `scanned = eligible + pending + skipped`.

A terminal failure in the past therefore cannot appear as `failed` while the
queue is empty. Failed webhook notifications are retried with bounded
exponential backoff through `nextRetryAt` (2, 4, 8, 16 minutes, capped at 1 hour).
