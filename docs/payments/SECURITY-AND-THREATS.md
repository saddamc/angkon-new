# Payment Security & Threat Model

This document outlines the threat modeling, potential attack vectors, and engineering mitigations implemented in the ANGKON payment architecture.

---

## 1. Threat Matrix & Mitigations

| Threat Vector | Severity | Attack Scenario | ANGKON Mitigation |
|---|:---:|---|---|
| **Price / Amount Tampering** | Critical | Attacker modifies client payload to initiate ৳1 payment for a ৳5,000 product. | Prices are completely recalculated server-side from MongoDB (`Order` & `Product` collections) at initiation. In addition, `VerifyPaymentService` rejects any gateway transaction whose amount differs by more than ৳0.01. |
| **Currency Spoofing** | High | Attacker submits a transaction in USD or INR instead of BDT. | Gateway currency is strictly checked against expected currency (`BDT`). Mismatch aborts confirmation and flags for security review. |
| **Callback Spoofing** | Critical | Attacker sends a forged POST request to `/api/payments/sslcommerz/success` with `status=VALID`. | Browser callbacks are treated as untrusted. Confirmation requires direct server-to-server call to SSLCOMMERZ validation API using secret store credentials. |
| **Webhook Replay Attack** | Medium | Attacker or gateway misconfiguration replays an identical IPN multiple times. | Webhook payloads are hashed into a deterministic SHA-256 fingerprint in `PaymentWebhookInbox`. Duplicates return 200 OK immediately without triggering side effects. |
| **Concurrent Double Settlement** | Critical | Callback and IPN arrive simultaneously, risking double inventory deduction or duplicate emails. | Handled via atomic conditional queries `{ _id, paymentStatus: { $ne: "paid" } }`. Only the first claim executes stock commit. |
| **Late Failure Downgrade** | Critical | Attacker triggers a failure callback after a transaction has already been validated and confirmed. | State machine enforces the **No-Downgrade Invariant**: `succeeded` can never transition to `failed` or `cancelled`. |
| **Session Key Leakage** | Medium | Gateway session keys exposed in database dumps or client bundles. | Gateway session keys are hashed using SHA-256 before persisting in MongoDB. |
| **Card / CVV Data Exposure** | Critical | PCI-DSS non-compliance from logging raw card or CVV details. | Deep redaction (`redactSensitiveData`) strips all passwords, full card numbers, and CVVs before persisting in `PaymentEvent` or `PaymentWebhookInbox`. |
| **Denial of Service / Flooding** | High | Bot army floods payment initiation to exhaust server sockets or gateway quota. | MongoDB-backed distributed rate limiter (`RateLimitBucket`) enforces a strict window of 10 requests per minute per IP using HMAC-hashed keys. |
| **Credential Exposure** | Critical | `SSLCOMMERZ_STORE_PASSWORD` accidentally included in frontend client JS bundle. | Credentials are only accessed in server-only modules (`src/server/payments/providers/sslcommerz/config.ts`). Next.js bundling guards ensure zero client leakage. |

---

## 2. Authentication & authorization matrix

| Endpoint | Who may call it | Gate |
|---|---|---|
| `POST /api/payments/sslcommerz/initiate` | Owning customer | Session + order ownership |
| `POST /api/payments/[attemptId]/retry` | Owning customer, or the browser holding the signed status token | Session/ownership, or HMAC status token; unresolved attempts are refused |
| `GET /api/payments/[attemptId]/status` | Owning customer, or the browser holding the signed status token | Token/ownership + 60 req/min IP limit |
| `GET /checkout/payment-status/[attemptId]` | Same as status API | `notFound()` for anyone else |
| `POST /api/payments/[attemptId]/refund` | Administrator | Admin session + mandatory reason |
| `POST /api/payments/[attemptId]/reconcile` | Administrator | Admin session |
| `POST /api/payments/[attemptId]/note` | Administrator | Admin session + mandatory note |
| `GET|POST /api/payments/reconcile` | Administrator or cron | Admin session, or `Bearer <CRON_SECRET>` / `?key=`; fails closed |
| `POST /api/payments/sslcommerz/ipn` | SSLCOMMERZ only | Durable inbox + validator API; forged failures are ignored |
| `POST /api/payments/sslcommerz/{success,fail,cancel}` | Browser return | Never trusted alone; success requires `val_id`, failure requires validator confirmation |

Money-moving operations (`initiate`, `retry`) are never authorized by an order
number alone. Order numbers are sequential and therefore enumerable; they are
not secrets.

## 3. Customer PII & IP Address Privacy

In compliance with data protection standards:
1. Client IP addresses are not stored in plaintext in the rate-limiting buckets.
2. IPs are hashed via HMAC-SHA256 (`hashIp`) using private server secrets:
   ```ts
   const hashedIp = crypto.createHmac("sha256", getJwtSecret()).update(ip).digest("hex").slice(0, 32);
   ```
3. Passwords and credentials never appear in structured security logs.
