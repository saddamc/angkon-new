# Payment Troubleshooting & Diagnostics

Common issues, causes, and step-by-step resolution steps for the payment subsystem.

---

## Issue 1: "SSLCOMMERZ store credentials are not configured"

**Symptom:** Payment initiation fails with code `PAYMENT_GATEWAY_NOT_CONFIGURED` (HTTP 503).  
**Cause:** `SSLCOMMERZ_STORE_ID` or `SSLCOMMERZ_STORE_PASSWORD` is missing in environment variables.  
**Resolution:**
1. Check your `.env` or `.env.production` file.
2. Ensure both values are present:
   ```env
   SSLCOMMERZ_STORE_ID=angkon_store
   SSLCOMMERZ_STORE_PASSWORD=your_store_password
   SSLCOMMERZ_MODE=sandbox
   ```
3. Restart the server.

---

## Issue 2: "Customer was charged by bank but order shows pending"

**Symptom:** Customer returns without confirmation or closed their app during 2FA, but money was deducted.  
**Resolution:**
1. Do not ask the customer to pay again.
2. Go to Admin Portal → `/admin/payments`.
3. Search by the customer's Order Number or phone number.
4. If the attempt has status `pending` or `unknown`:
   - Click **Run Reconciliation Job** at the top right of `/admin/payments` (or trigger `POST /api/payments/reconcile`).
   - The system queries SSLCOMMERZ with `querySslcommerzTransactionByTranId`.
   - If the gateway has recorded a successful transaction, the order is automatically settled to `paid` and confirmed.

---

## Issue 3: "Too many requests. Please wait a few moments" (HTTP 429)

**Symptom:** Customer or automated tester sees 429 status code on payment initiation or retry.  
**Cause:** MongoDB rate limiter detected more than 10 initiation attempts within a 60-second window.  
**Resolution:**
- Inspect `RateLimitBucket` collection in MongoDB for keys starting with `pay_init:ip:`.
- Check `Retry-After` header returned in the 429 response to know the exact remaining wait time.

---

## Issue 4: "Missing val_id in success callback"

**Symptom:** Customer redirected to `/checkout/payment-status/[attemptId]?status=unconfirmed`.  
**Cause:** The browser returned to the success URL without the expected `val_id` parameter (browser extension blocked query params or URL was truncated).  
**Resolution:**
- The background reconciler will query the transaction by `tranId` directly on the gateway without requiring the browser's `val_id`.

---

## Issue 5: Diagnostics & Verification Commands

Run unit and integration payment test suites:
```bash
node --test tests/payments/*.test.ts
```

Run complete hardening test suite:
```bash
node --test tests/mongodb-rate-limit-and-sslcommerz.test.mjs tests/payment-and-order-hardening.test.mjs tests/payment-reconciliation.test.mjs
```

Verify TypeScript types:
```bash
npm run typecheck
```
