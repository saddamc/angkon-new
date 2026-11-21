# Payment Module Architecture

## System Diagram

```
[ Customer Browser ]
        │
        ├── 1. POST /api/payments/sslcommerz/initiate
        │       │
        │       ▼
        │   InitiatePaymentService ────► Recalculate Prices & Check Stock (MongoDB)
        │       │
        │       ▼
        │   PaymentAttemptRepository ──► Store 'created' / 'initiating' attempt (MongoDB)
        │       │
        │       ▼
        │   SSLCOMMERZ Client ────────► POST /gwprocess/v4/api.php
        │       │
        │       ▼ (Gateway Session URL)
        ◄───────┴──────────────────────── Redirect Customer
        │
[ SSLCOMMERZ Hosted Portal ]
        │
        ├── 2. Customer Browser Redirect ──────► /api/payments/sslcommerz/success (POST/GET)
        │                                             │
        └── 3. Server-to-Server IPN Webhook ──► /api/payments/sslcommerz/ipn (POST)
                                                      │
                                                      ▼
                                            PaymentWebhookInbox (Durable Deduplication)
                                                      │
                                                      ▼
                                            VerifyPaymentService
                                            (Calls /validator/api/validationserverAPI.php)
                                                      │
                                                      ├── [Valid & Safe] ──► FinalizePaymentService
                                                      │                       ├── Mark Payment Attempt 'succeeded'
                                                      │                       ├── Settle Order 'paid' (Atomic)
                                                      │                       └── Commit Inventory Once
                                                      │
                                                      └── [High Risk / Mismatch]
                                                                              └── Mark 'review_required' & Held
```

---

## Directory Organization

```
src/
├── app/
│   ├── api/
│   │   └── payments/
│   │       ├── sslcommerz/
│   │       │   ├── initiate/route.ts
│   │       │   ├── success/route.ts
│   │       │   ├── fail/route.ts
│   │       │   ├── cancel/route.ts
│   │       │   └── ipn/route.ts
│   │       │
│   │       ├── [attemptId]/
│   │       │   ├── status/route.ts
│   │       │   └── retry/route.ts
│   │       │
│   │       └── reconcile/route.ts
│   │
│   ├── checkout/
│   │   └── payment-status/
│   │       └── [attemptId]/page.tsx
│   │
│   ├── account/
│   │   └── orders/
│   │       └── [orderId]/payment/page.tsx
│   │
│   └── admin/
│       └── payments/
│           ├── page.tsx
│           └── [attemptId]/page.tsx
│
├── models/
│   ├── PaymentAttempt.ts
│   ├── PaymentEvent.ts
│   ├── PaymentWebhookInbox.ts
│   └── RateLimitBucket.ts
│
└── server/
    └── payments/
        ├── index.ts
        ├── types.ts
        ├── constants.ts
        ├── payment-state-machine.ts
        ├── payment-errors.ts
        ├── payment-idempotency.ts
        │
        ├── services/
        ├── providers/sslcommerz/
        ├── repositories/
        ├── utils/
        └── jobs/
```

---

## Database Collections

1. **`payments` (`PaymentAttempt`):**
   - Stores each payment attempt lifecycle with unique index on `tranId`.
   - Sparse unique index on `valId` and `idempotencyKey`.
   - Shared with legacy `Payment` model to ensure complete backward compatibility.

2. **`paymentevents` (`PaymentEvent`):**
   - Append-only chronological audit log.
   - Records all events: `payment_initiation_started`, `customer_redirected`, `callback_received`, `validation_started`, `validation_succeeded`, `payment_confirmed`, etc.

3. **`paymentwebhookinboxes` (`PaymentWebhookInbox`):**
   - Durable inbox storing all raw IPN webhooks.
   - Enforces unique `eventFingerprint` (SHA-256) to ensure idempotent handling of duplicate gateway webhooks.

4. **`ratelimitbuckets` (`RateLimitBucket`):**
   - Atomic rate-limiting collection.
   - Stores `{ key, windowStart, count, expiresAt }` with a unique index on `key` and TTL index on `expiresAt`.

---

## Single settlement path

There is exactly one implementation of every financial operation:

- Session creation: `providers/sslcommerz/create-session.ts` via `InitiatePaymentService`.
- Verification: `VerifyPaymentService` (+ pure `evaluateSslcommerzResult` for unit tests).
- Settlement: `FinalizePaymentService` ? `OrderPaymentRepository` (order claim + stock commit exactly once).
- Characterisation of failures: `ProcessFailureService` / `ProcessCancellationService`.
- Gateway notifications: `ProcessIpnService` with the durable inbox.
- Recovery: `ReconcilePaymentService` + `runAllPaymentJobs()`.

The historical routes `/api/payment/sslcommerz/{callback,ipn,initiate,reconcile}` are
thin adapters kept for in-flight sessions. They contain no settlement logic of
their own and delegate to the services above. `settle.ts`, `reconcile.ts` and
`verify.ts` were removed so a second implementation cannot drift back in.
