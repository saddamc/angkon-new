# Staging Deployment Guide — ANGKON

## 1. Staging Purpose & Isolation
The staging environment mirrors production while using sandbox external gateways:
* **Database:** Dedicated staging MongoDB database (`angkon_staging`), never production.
* **SSLCOMMERZ:** `SSLCOMMERZ_MODE=sandbox` (live mode stays off).
* **Courier:** `COURIER_MODE=mock` (or staging Steadfast test credentials if authorized).
* **Base URL:** Staging domain (e.g. `https://staging.angkon.com`).

---

## 2. Deployment Steps

1. **Push to Staging Branch:**
   ```powershell
   git checkout -b staging
   git push origin staging
   ```
2. **VPS Staging Environment:**
   * Deploy a separate VPS release using the VPS runbook.
   * Use the staging env file with `APP_ENVIRONMENT=preview` or `staging`.
   * Ensure `CRON_SECRET` matches the staging scheduler.
   * Never point staging at the production database or live courier credentials.
3. **Automated Verification:**
   * Run the integration probe against the staging domain:
     ```powershell
     node scripts/sandbox/probe-integrations.mjs https://staging.angkon.com
     ```
4. **Manual UAT:**
   * Place a test order with online advance payment using SSLCOMMERZ Sandbox test cards.
   * Verify IPN delivery and MongoDB order state transition to `paid`.
   * Book a mock shipment and verify tracking code generation.
