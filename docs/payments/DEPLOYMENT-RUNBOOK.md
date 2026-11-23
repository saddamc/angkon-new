# Production Deployment Runbook — Payment Subsystem

This runbook outlines the pre-flight checks, environment configuration, database index provisioning, and verification steps required before going live with SSLCOMMERZ on production.

---

## 1. Pre-Deployment Checklist

- [ ] Production SSLCOMMERZ Store ID and Store Password obtained from SSLCOMMERZ operations.
- [ ] Merchant Portal IPN configured: In SSLCOMMERZ Merchant Panel → **IPN Settings**, set IPN URL to:
  ```
  https://angkon.com.bd/api/payments/sslcommerz/ipn
  ```
  *(HTTP POST format).*
- [ ] HTTPS enforced across all endpoints with valid SSL certificate.
- [ ] `CRON_SECRET` generated (cryptographically random 32+ characters).
- [ ] Background reconciliation cron configured in Vercel / Cloud Scheduler to hit:
  ```
  POST https://angkon.com.bd/api/payments/reconcile
  Authorization: Bearer <CRON_SECRET>
  ```
  *(Schedule: Every 5 or 10 minutes).*

---

## 2. Production Environment Variables

Ensure these variables are configured in the production environment (e.g. Vercel / Railway / AWS):

```env
# SSLCOMMERZ Live Credentials
SSLCOMMERZ_STORE_ID=angkon_live_store
SSLCOMMERZ_STORE_PASSWORD=super_secret_live_password
SSLCOMMERZ_IS_LIVE=true
SSLCOMMERZ_MODE=live

# Canonical App URL
NEXT_PUBLIC_APP_URL=https://angkon.com.bd

# Production Cron Secret
CRON_SECRET=7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f

# Rate Limiter & Security Secrets
JWT_SECRET=production_strong_jwt_secret_key_64_chars_min
```

---

## 3. Database Indexes Verification

Run the migration script to verify that all compound and unique indexes exist on MongoDB Atlas:
```bash
node scripts/migrations/2026-11-12-payments-shipments-indexes.mjs
```

Verify that the following indexes are active in the MongoDB Atlas console:
1. `payments`: `{ tranId: 1 }` (Unique), `{ valId: 1 }` (Sparse Unique), `{ orderId: 1, attemptNumber: -1 }`.
2. `paymentevents`: `{ attemptId: 1, at: 1 }`, `{ tranId: 1 }`.
3. `paymentwebhookinboxes`: `{ eventFingerprint: 1 }` (Unique), `{ tranId: 1 }`.
4. `paymentrefunds`: `{ refundId: 1 }` (Unique), `{ paymentId: 1 }`.
5. `ratelimitbuckets`: `{ key: 1 }` (Unique), `{ expiresAt: 1 }` (TTL).

---

## 4. Post-Deployment Smoke Test (Live ৳10 Test)

1. Create a test product priced at ৳10 on production (or hidden category).
2. Complete checkout using a real credit card or bKash wallet.
3. Verify that:
   - Redirect to `https://securepay.sslcommerz.com` succeeds.
   - Payment succeeds and redirects to `/checkout/payment-status/[attemptId]`.
   - Order transitions to `paymentStatus: "paid"`, `orderStatus: "processing"`.
   - Admin portal shows the transaction at `/admin/payments` with risk level 0.
   - Audit events are logged in `/admin/payments/[attemptId]`.
4. Execute a test refund of ৳10 from `/admin/payments/[attemptId]` and verify that the refund request is accepted by SSLCOMMERZ.

---

## 5. Rollback Plan

If unexpected gateway behavior occurs in production:
1. Revert to `SSLCOMMERZ_MODE=sandbox` (and `SSLCOMMERZ_IS_LIVE=false`) to immediately redirect test orders to sandbox.
2. In Admin Portal → Settings, disable online payments temporarily; the store will automatically default to Cash on Delivery (COD) without disrupting customer checkout.
3. Review `/admin/payments` and structured security logs for gateway error codes.
