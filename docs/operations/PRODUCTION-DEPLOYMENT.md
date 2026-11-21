# Production Deployment Runbook — ANGKON

## 1. Pre-Deployment Quality Gates

Before initiating a production deployment, all 5 quality gates must pass cleanly:
1. `npx tsx --test tests/payments/*.test.ts tests/orders-payment-courier-workflow.test.ts tests/steadfast-modes.test.ts` (0 failures)
2. `npm run typecheck` (0 errors)
3. `npm run lint` (0 errors)
4. `npm run build` (0 errors, 100% static/dynamic routes generated)
5. `npm run probe:integrations` (13/14 passed, Pathao optional inactive)

---

## 2. Production Environment Configuration (Vercel)

Ensure all variables are populated in the **Vercel Production Project Settings**:

```text
MONGODB_URI = <Production MongoDB Atlas Connection String>
JWT_SECRET = <Cryptographically Secure 64-char string>
CRON_SECRET = <Random 32-char alphanumeric token>
NEXT_PUBLIC_BASE_URL = https://angkon.com

SSLCOMMERZ_STORE_ID = <Live Store ID>
SSLCOMMERZ_STORE_PASSWORD = <Live Store Password>
SSLCOMMERZ_IS_SANDBOX = false

COURIER_MODE = live
STEADFAST_LIVE_BOOKING_ENABLED = true
STEADFAST_BASE_URL = https://portal.packzy.com/api/v1
STEADFAST_API_KEY = <Live Steadfast API Key>
STEADFAST_SECRET_KEY = <Live Steadfast Secret Key>
STEADFAST_WEBHOOK_SECRET = <Live Steadfast Webhook Secret>

CLOUDINARY_CLOUD_NAME = <Production Cloud Name>
CLOUDINARY_API_KEY = <Production API Key>
CLOUDINARY_API_SECRET = <Production API Secret>
```

---

## 3. Deployment Procedure

1. **Tag the Release Candidate:**
   ```powershell
   git tag -a v1.0.0-rc1 -m "Production Release Candidate 1"
   git push origin v1.0.0-rc1
   ```
2. **Deploy to Vercel Production:**
   ```powershell
   vercel --prod
   ```
   Or trigger automatic deployment by merging to `main`.

3. **Post-Deployment Verification:**
   * Verify read-only balance in **Admin → Orders** (`৳...`).
   * Test public storefront loading (`/`, `/products`, `/checkout`).
   * Verify Vercel Cron jobs are active under **Vercel Dashboard → Project → Settings → Cron Jobs**.
