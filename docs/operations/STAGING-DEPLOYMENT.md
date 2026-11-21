# Staging Deployment Guide — ANGKON

## 1. Staging Purpose & Isolation
The staging environment mirrors production while using sandbox external gateways:
* **Database:** Dedicated staging MongoDB database (`angkon_staging`), never production.
* **SSLCOMMERZ:** `SSLCOMMERZ_IS_SANDBOX=true`.
* **Courier:** `COURIER_MODE=mock` (or staging Steadfast test credentials if authorized).
* **Base URL:** Staging domain (e.g. `https://staging.angkon.com`).

---

## 2. Deployment Steps

1. **Push to Staging Branch:**
   ```powershell
   git checkout -b staging
   git push origin staging
   ```
2. **Vercel Staging Environment:**
   * Configure environment variables in the Vercel Staging project.
   * Ensure `CRON_SECRET` matches your test automation runner.
3. **Automated Verification:**
   * Run the integration probe against the staging domain:
     ```powershell
     node scripts/sandbox/probe-integrations.mjs https://staging.angkon.com
     ```
4. **Manual UAT:**
   * Place a test order with online advance payment using SSLCOMMERZ Sandbox test cards.
   * Verify IPN delivery and MongoDB order state transition to `paid`.
   * Book a mock shipment and verify tracking code generation.
