# Incident Recovery Playbook — ANGKON

## 1. Severity Levels

* **P1 (Critical):** Checkout completely broken; payment gateway returning 5xx; database unavailable.
* **P2 (Major):** Courier booking failing; webhook processing delayed; reconciliation stopped.
* **P3 (Minor):** Non-blocking UI glitch; reporting discrepancies; optional integration warning.

---

## 2. Emergency Playbooks

### Playbook 1: SSLCOMMERZ Major Outage
If SSLCOMMERZ is down or degraded:
1. Go to **Admin → Settings → Checkout**.
2. Temporarily enable **Full Cash on Delivery (COD)** fallback or disable online gateway option.
3. Customer orders will complete as COD without failing checkout.
4. Notify SSLCOMMERZ technical support and monitor their status page.

### Playbook 2: Steadfast Courier Gateway Outage
If Steadfast API is down:
1. Consignments will cleanly fail to status `booking_failed` without affecting payment status or order records.
2. Orders remain in `confirmed` or `processing`.
3. Once Steadfast recovers, go to **Admin → Orders → Needs Action** and click **Retry Booking** on affected parcels.
4. If outage is prolonged, switch courier mode to **Manual Delivery** in the order drawer and record manual consignment details.

### Playbook 3: Emergency Rollback
If a faulty deployment enters production:
1. Open Vercel Dashboard → **Deployments**.
2. Locate the previous stable deployment (or checkout tag `v1.0.0-rc1`).
3. Click **Instant Rollback**.
4. Rollback executes in $< 10$ seconds globally at the edge without downtime.
