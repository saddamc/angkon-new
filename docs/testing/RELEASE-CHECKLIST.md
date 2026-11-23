# Production Release Checklist — ANGKON

Use this authoritative checklist before authorizing any deployment to production. Every item must be verified.

---

## 1. Code Quality & Test Gates

- [ ] **Working Tree:** All changes reviewed; no untracked or unverified debug files.
- [ ] **TypeScript Check:** `npm run typecheck` passes with **0 errors**.
- [ ] **Lint Analysis:** `npm run lint` passes cleanly.
- [ ] **Unit Tests:** `npm run test:unit` passes (46 tests covering rate limiting, weights, sanitization).
- [ ] **Contract Tests:** `npm run test:contracts` passes (51 tests covering schemas, cancellation, admin order create).
- [ ] **Payment Tests:** `npm run test:payments` passes (89 tests covering SSLCOMMERZ lifecycle, idempotency, refund safety).
- [ ] **Integration Tests:** `npm run test:integration` passes (91 tests covering Steadfast modes, live booking, weight calculations).
- [ ] **Full Test Suite:** `npm run test:all` executes all suites without failure.
- [ ] **Production Build:** `npm run build` succeeds cleanly.

---

## 2. Environment & Database Isolation

> Refer to: [`docs/operations/ENVIRONMENT-SETUP.md`](../operations/ENVIRONMENT-SETUP.md)

- [ ] **Database Connection:** `DATABASE_URL` / `MONGODB_URI` points strictly to the production Atlas cluster (`angkon` database).
- [ ] **Isolation Guard:** Verify `APP_ENVIRONMENT=production` prevents any connection to staging/test databases.
- [ ] **High-Entropy Secrets:** `JWT_SECRET` and `CRON_SECRET` are securely configured in Vercel / server environment.
- [ ] **Server-Only Credentials:** Ensure no payment or courier secret keys carry the `NEXT_PUBLIC_` prefix.

---

## 3. Payment Gateway & Financial Safeguards

> Refer to: [`docs/payments/SSLCOMMERZ-INTEGRATION.md`](../payments/SSLCOMMERZ-INTEGRATION.md) & [`docs/payments/DEPLOYMENT-RUNBOOK.md`](../payments/DEPLOYMENT-RUNBOOK.md)

- [ ] **Live Gateway Mode:** `SSLCOMMERZ_IS_LIVE=true` (or `SSLCOMMERZ_MODE=live`) with live merchant credentials.
- [ ] **Server-Side Validation:** Browser return only triggers backend `/validator/api/validationserverAPI.php` check; never trusts client-side query parameters.
- [ ] **IPN Webhook Inbox:** Deduplication active via SHA-256 event fingerprinting to handle duplicate webhooks gracefully.
- [ ] **Terminal State Immutability:** Succeeded payments and refunded payments cannot be downgraded by delayed failure webhooks.
- [ ] **Background Reconciliation:** Vercel Cron or scheduled reconciliation active for unreturned sessions.

---

## 4. Courier Logistics & Steadfast Live Booking

> Refer to: [`docs/courier/MOCK-AND-LIVE-MODES.md`](../courier/MOCK-AND-LIVE-MODES.md) & [`docs/courier/TRACKING-AND-RETURNS.md`](../courier/TRACKING-AND-RETURNS.md)

- [ ] **Live Courier Mode:** `COURIER_MODE=live` and `STEADFAST_LIVE_BOOKING_ENABLED=true` set in production environment.
- [ ] **Read-Only Probe:** Execute read-only balance check against Steadfast API to confirm live API key validity.
- [ ] **Weight Calculation Gate:** Automatic parcel weight calculates correctly from catalog items; orders with missing weight require explicit manual verification.
- [ ] **Test Order Quarantine:** QA/Test orders (`isTestOrder: true`) are strictly blocked from booking live courier consignments.
- [ ] **Duplicate Booking Lock:** Prevents accidental double-booking of consignments on rapid repeated clicks.

---

## 5. Rollback & Incident Recovery

> Refer to: [`docs/operations/INCIDENT-RECOVERY.md`](../operations/INCIDENT-RECOVERY.md)

- [ ] **Pre-Deploy Database Backup:** Database snapshot or export taken prior to deployment.
- [ ] **Rollback Commit SHA:** Note previous stable commit SHA on `main`:
  `PREV_STABLE_SHA: ____________________`
- [ ] **Instant Redeploy Access:** Verified access to Vercel deployment dashboard for 1-click rollback if health checks fail.
- [ ] **Reconciliation Fallback:** If courier or payment webhooks fail, manual audit drawer & sync buttons in Admin Portal are verified functional.
