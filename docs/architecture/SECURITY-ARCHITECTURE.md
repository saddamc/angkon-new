# Security Architecture — ANGKON

## 1. Authentication & Authorization Framework

### A. Customer Authentication
* Passwords hashed using standard `bcrypt` with salt rounds = 10.
* JWT authentication tokens with signed secret keys (`JWT_SECRET`).
* HttpOnly, Secure, SameSite cookies for session management.

### B. Administrative Authorization
* Protected admin routes enforce `requireAdminSessionCore` checking valid admin JWT tokens and roles (`superadmin`, `admin`, `manager`).
* Admin operations require explicit tenant identification and write immutable audit logs in `AdminAuditLog`.

---

## 2. Webhook & Gateway Security

### A. SSLCOMMERZ IPN Security
* Direct browser redirects are never used to confirm payment success.
* IPN requests trigger a server-to-server validation call to SSLCOMMERZ with strict credential headers.
* Duplicate IPN deliveries are deduplicated by SHA-256 event fingerprinting:
  ```typescript
  const fingerprint = sha256(`${tran_id}:${status}:${val_id}:${amount}`);
  ```

### B. Steadfast Courier Webhook Security
* Steadfast webhooks are validated using HMAC-SHA256 signature verification via `STEADFAST_WEBHOOK_SECRET`.
* Unknown webhook payloads are safely logged without mutating order financial records.

---

## 3. Distributed Rate Limiting & Abuse Prevention

* Implemented in `src/server/rate-limit.ts` using native MongoDB collections (`RateLimitBucket`) with automated TTL index expiration.
* **Checkout Rate Limit:** 10 requests / 5 minutes per IP.
* **Payment Initiation:** 5 requests / 1 minute per IP.
* **Admin Login:** 5 attempts / 15 minutes per IP with exponential lockout.

---

## 4. Sensitive Data Redaction & Logging Safeguards

* Passwords, credit card numbers, CVVs, API keys, and session tokens are automatically sanitized before writing to logs:
  ```typescript
  export function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    // Sanitizes 'password', 'card_number', 'api_key', 'secret_key', 'token'
  }
  ```
* Error responses returned to client browsers never expose stack traces or internal connection strings.
