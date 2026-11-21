# Payment Status & Error Codes Reference

## Payment Attempt Statuses (`status`)

| Status | Type | Description | Permitted Next Statuses |
|---|---|---|---|
| `created` | Non-Terminal | Attempt record created in DB before contacting gateway | `initiating`, `failed`, `expired` |
| `initiating` | Non-Terminal | Communicating with SSLCOMMERZ `/gwprocess/v4/api.php` | `pending`, `failed`, `unknown` |
| `pending` | Non-Terminal | Session active, customer redirected to gateway | `succeeded`, `failed`, `cancelled`, `expired`, `unknown`, `review_required` |
| `succeeded` | Terminal | Payment validated server-side and settled | `refunded`, `partially_refunded` (NEVER failed/cancelled) |
| `failed` | Terminal | Declined by bank or gateway | None (New attempt created on retry) |
| `cancelled` | Terminal | Customer explicitly cancelled | None (New attempt created on retry) |
| `expired` | Terminal | Session timed out (> 4 hours without action) | None (New attempt created on retry) |
| `unknown` | Non-Terminal | Gateway response unconfirmed / network timeout | `succeeded`, `failed`, `cancelled`, `expired`, `review_required` |
| `review_required` | Non-Terminal | Valid payment but high risk or amount mismatch | `succeeded`, `failed`, `refunded` |
| `refunded` | Terminal | Full refund issued | None |
| `partially_refunded`| Terminal | Partial refund issued | `refunded` |

---

## Legacy status aliases (migration window)

Rows written before the centralized module use two historical values. They are
normalized on every read, so both generations remain safe while the one-time
migration runs:

| Legacy | Canonical | Behaviour |
|---|---|---|
| `paid` | `succeeded` | Treated as successful; cannot be downgraded or retried; may be refunded |
| `initiated` | `pending` | Treated as awaiting confirmation; reconciled, never auto-failed |

Normalize stored rows with:

```bash
node scripts/migrations/2026-11-20-payment-status-normalize.mjs          # dry run
node scripts/migrations/2026-11-20-payment-status-normalize.mjs --apply
```

## Reconciliation Statuses (`reconciliationStatus`)

- `not_required`: Initial state for newly created attempts.
- `scheduled`: Session queued for background status query.
- `processing`: Background job actively querying SSLCOMMERZ.
- `resolved`: Reconciler successfully confirmed status (succeeded, failed, cancelled, or expired).
- `manual_review`: Reconciler hit retry limits or encountered ambiguous state requiring staff inspection.

---

## Customer Activity Statuses (`customerActivity`)

- `not_redirected`: Payment session not yet redirected.
- `redirected`: Customer was forwarded to SSLCOMMERZ gateway.
- `returned_success`: Customer redirected back to `/api/payments/sslcommerz/success`.
- `returned_failed`: Customer redirected to failure endpoint.
- `returned_cancelled`: Customer clicked cancel on gateway.
- `no_return_detected`: Customer abandoned session, closed browser, or lost network connection.

---

## Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `ORDER_NOT_FOUND` | 404 | Order number does not exist in MongoDB |
| `ALREADY_PAID` | 400 | Attempted to pay an order whose `paymentStatus === "paid"` |
| `INVALID_ORDER_STATE` | 400 | Cannot pay for a cancelled or refunded order |
| `OUT_OF_STOCK` | 409 | Inventory is depleted before gateway redirection |
| `MAX_ATTEMPTS_EXCEEDED`| 429 | Order reached 5 payment attempts limit |
| `GATEWAY_SESSION_FAILED`| 502 | SSLCOMMERZ session API returned FAILED or error |
| `GATEWAY_TIMEOUT` | 504 | Connection timeout to SSLCOMMERZ gateway |
| `PAYMENT_VALIDATION_FAILED`| 400 | Server-side validation returned INVALID or mismatched data |
| `RISK_LEVEL_FLAGGED` | 200/400 | Gateway returned risk_level 1 (high risk) |
| `RATE_LIMIT_EXCEEDED` | 429 | Client exceeded route rate limit quota |
