# Payment Database Schema & Index Specification

This document details all MongoDB collections, schemas, indexes, and lifecycle hooks implemented for the payment domain.

---

## 1. `payments` Collection (`PaymentAttempt`)

Main financial tracking record for every payment attempt. Shares the `"payments"` collection with legacy `Payment` model for backward compatibility.

| Field | Type | Index | Description |
|---|---|:---:|---|
| `_id` | ObjectId | Primary Key | Unique document identifier |
| `orderId` | ObjectId | Indexed | Reference to `Order` |
| `orderNumber` | String | Indexed | Order reference (e.g. `ANG-261120-1001`) |
| `userId` | ObjectId | Sparse | Reference to authenticated customer |
| `attemptNumber`| Number | Compound | Sequential attempt counter (1, 2, 3...) |
| `tranId` | String | Unique | Unique transaction ID (`ANG-1001`, `ANG-1001-A2`) |
| `expectedAmount`| Number | — | Recalculated total from order at initiation |
| `amount` | Number | — | Legacy alias for `expectedAmount` |
| `currency` | String | — | Default `BDT` |
| `status` | String | Compound | PaymentAttemptStatus enum |
| `customerActivity`| String | — | Customer presence/return indicator |
| `reconciliationStatus`| String| Compound| Reconciler state machine |
| `gatewaySessionKey`| String | — | SHA-256 masked session key |
| `gatewayRedirectUrl`| String| — | URL to redirect customer |
| `valId` | String | Sparse Unique| Validation ID returned by SSLCOMMERZ |
| `bankTranId` | String | — | Bank transaction ID |
| `cardType` | String | — | e.g. `BKASH-BKash`, `VISA-CityBank` |
| `cardBrand` | String | — | e.g. `VISA`, `MASTERCARD`, `MOBILEBANKING` |
| `riskLevel` | String | — | `"0"` (Safe), `"1"` (High Risk) |
| `riskTitle` | String | — | Gateway risk evaluation notes |
| `reconcileAttempts`| Number| — | Number of times reconciler queried this attempt |
| `nextCheckAt` | Date | Indexed | Next scheduled time for reconciler check |
| `lastCheckedAt` | Date | — | Timestamp of last reconciliation query |
| `paidAt` | Date | — | Timestamp when validated server-side |
| `failedAt` | Date | — | Timestamp when marked failed |
| `cancelledAt` | Date | — | Timestamp when customer cancelled |
| `expiredAt` | Date | — | Timestamp when marked expired |
| `rawValidation` | Object | — | Sanitized raw validation response from SSLCOMMERZ |
| `createdAt` | Date | Indexed | Creation timestamp |
| `updatedAt` | Date | — | Last update timestamp |

### Database Indexes
- `{ tranId: 1 }` (Unique)
- `{ validationId: 1 }` (Sparse Unique)
- `{ valId: 1 }` (Sparse Unique)
- `{ orderId: 1, attemptNumber: -1 }`
- `{ orderNumber: 1, createdAt: -1 }`
- `{ status: 1, nextCheckAt: 1 }`
- `{ reconciliationStatus: 1, nextCheckAt: 1 }`
- `{ idempotencyKey: 1 }` (Sparse Unique)

---

## 2. `paymentevents` Collection (`PaymentEvent`)

Append-only audit ledger recording every lifecycle transition chronologically.

| Field | Type | Index | Description |
|---|---|:---:|---|
| `_id` | ObjectId | Primary Key | |
| `attemptId` | ObjectId | Indexed | Associated `PaymentAttempt` |
| `orderId` | ObjectId | Indexed | Associated `Order` |
| `orderNumber` | String | Indexed | Order reference number |
| `tranId` | String | Indexed | Transaction ID |
| `eventType` | String | Indexed | Action: `payment_initiation_started`, `validation_succeeded`, etc. |
| `source` | String | — | Source: `customer_browser`, `sslcommerz_callback`, `sslcommerz_ipn`, `reconciliation_worker` |
| `timestamp` | Date | Indexed | Event timestamp |
| `gatewayStatus` | String | — | Gateway status string if present |
| `metadata` | Object | — | Redacted contextual data (amounts, validation results) |
| `correlationId` | String | Sparse | Tracing identifier |

---

## 3. `paymentwebhookinboxes` Collection (`PaymentWebhookInbox`)

Durable webhook inbox for idempotent ingestion of SSLCOMMERZ IPNs.

| Field | Type | Index | Description |
|---|---|:---:|---|
| `_id` | ObjectId | Primary Key | |
| `provider` | String | Indexed | Default `"sslcommerz"` |
| `attemptId` | ObjectId | Sparse Indexed | Linked payment attempt |
| `tranId` | String | Indexed | Transaction ID |
| `valId` | String | Sparse | Gateway validation ID |
| `eventFingerprint`| String | Unique | Deterministic SHA-256 fingerprint |
| `rawPayload` | Object | — | Redacted full webhook payload |
| `receivedAt` | Date | Indexed | Reception timestamp |
| `processingStatus`| String | Compound | `pending`, `processing`, `processed`, `failed`, `ignored` |
| `processingAttempts`| Number| — | Retry counter |
| `nextRetryAt` | Date | Compound | Next scheduled retry timestamp |

---

## 4. `paymentrefunds` Collection (`PaymentRefund`)

Independent financial record for every refund initiated against a successful payment.

| Field | Type | Index | Description |
|---|---|:---:|---|
| `_id` | ObjectId | Primary Key | |
| `refundId` | String | Unique | Internal refund ID (`REF-...`) |
| `paymentId` | ObjectId | Indexed | Linked `PaymentAttempt` |
| `orderId` | ObjectId | Indexed | Linked `Order` |
| `orderNumber` | String | Indexed | Order number |
| `tranId` | String | Indexed | Original transaction ID |
| `valId` | String | — | Gateway validation ID |
| `bankTranId` | String | — | Bank transaction reference |
| `amount` | Number | — | Refunded amount in BDT |
| `status` | String | Indexed | `initiated`, `pending`, `processing`, `succeeded`, `failed`, `cancelled` |
| `refundRefId` | String | Sparse | Gateway refund reference from SSLCOMMERZ |
| `reason` | String | — | Reason for refund |
| `requestedBy` | String | — | Admin email / username |
| `initiatedAt` | Date | Indexed | Request timestamp |
| `processedAt` | Date | — | Gateway execution timestamp |

---

## 5. `ratelimitbuckets` Collection (`RateLimitBucket`)

Native MongoDB rate limiter bucket storage.

| Field | Type | Index | Description |
|---|---|:---:|---|
| `_id` | ObjectId | Primary Key | |
| `key` | String | Unique | Bucket key (e.g. `pay_init:ip:<HMAC-HASH>`) |
| `windowStart` | Date | — | Start of the sliding window |
| `count` | Number | — | Atomic request counter |
| `expiresAt` | Date | TTL Index | Background TTL eviction index |
