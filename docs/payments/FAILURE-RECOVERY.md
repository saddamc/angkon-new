# Payment Failure Recovery & Reconciliation

This guide explains how ANGKON recovers from network disconnects, gateway outages, abandoned sessions, and payment failures.

---

## 1. Automated Background Reconciler

When a customer is redirected to SSLCOMMERZ, an internet outage or closed browser tab can prevent the return redirect from executing.

Rather than failing the order prematurely, the system schedules automatic reconciliation:

### Backoff Progression Schedule
The reconciler queries the gateway using exponential backoff intervals:
- Check 1: +2 minutes
- Check 2: +5 minutes
- Check 3: +10 minutes
- Check 4: +30 minutes
- Check 5: +1 hour
- Check 6: +2 hours
- Check 7: +4 hours

If the transaction is found to be `VALID` at any check:
1. Validates `val_id` via the server-to-server validation API.
2. Settles the order to `paid` atomically.
3. Commits reserved inventory.
4. Transitions attempt to `succeeded` and reconciliation status to `resolved`.

If the transaction is confirmed `FAILED` or `CANCELLED`:
1. Transitions attempt to `failed` or `cancelled`.
2. Restores inventory to available stock.
3. Marks reconciliation status as `resolved`.

---

## 2. Inactivity Expiration

If a payment attempt remains in `pending` or `created` state with no customer return or gateway record for **4 hours** (`SESSION_EXPIRATION_HOURS`):
1. Marked as `expired`.
2. `customerActivity` marked as `no_return_detected`.
3. Order payment marked as `failed` (expired).
4. Stock reservation released.

---

## 3. Safe Payment Retry

When an attempt fails or is cancelled:
- Customers can retry from the payment status page (`/checkout/payment-status/[attemptId]`) or the account order page (`/account/orders/[orderId]/payment`).
- The previous failed attempt is preserved immutably for audit history.
- The new attempt receives an incremented attempt number (e.g. `attemptNumber: 2`, `tranId: ANG-1001-A2`).
- A hard ceiling of **5 attempts** (`MAX_PAYMENT_ATTEMPTS`) prevents infinite retry loops.

---

## 4. Cron Scheduling

The background reconciliation job is triggered via `/api/payments/reconcile` (or `/api/payment/sslcommerz/reconcile`).

Authorization:
- Secured with bearer token matching `CRON_SECRET` or admin session.
- Can be invoked by external cron services (e.g., Vercel Cron, GitHub Actions, AWS EventBridge, or local cron).
