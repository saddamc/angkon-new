# Callback and IPN Processing Specification

This document details the request handling, validation rules, and race condition prevention for SSLCOMMERZ callbacks and Instant Payment Notifications (IPN).

---

## 1. Endpoints Overview

| Route | Method | Actor | Purpose |
|---|---|---|---|
| `/api/payments/sslcommerz/success` | POST / GET | Customer Browser | Success return redirect from SSLCOMMERZ |
| `/api/payments/sslcommerz/fail` | POST / GET | Customer Browser | Failure return redirect |
| `/api/payments/sslcommerz/cancel` | POST / GET | Customer Browser | Cancellation return redirect |
| `/api/payments/sslcommerz/ipn` | POST | SSLCOMMERZ Server | Server-to-server webhook notification |

---

## 2. Browser Return Callbacks

### Core Security Mandate: Callbacks Are Untrusted
The browser redirect is an untrusted client transmission. Anyone could tamper with URL query parameters or send a fabricated POST request.
Therefore:
1. Status strings in the callback payload are ignored as proof of payment.
2. The server extracts the `val_id` and immediately validates it via direct server-to-server call to SSLCOMMERZ `/validator/api/validationserverAPI.php`.
3. If no `val_id` is present or validation fails, payment is not confirmed.

### HTTP Response
Callbacks redirect the customer browser to the customer-facing payment status page using HTTP 303 See Other:
```
303 See Other -> /checkout/payment-status/[attemptId]
```

---

## 3. Server-to-Server IPN (Instant Payment Notification)

### Ingestion Flow
1. **Rate Limiting:** Guarded by `checkDualRateLimit` with a high ceiling (120 req/minute) so that legitimate SSLCOMMERZ retries are not dropped.
2. **Durable Inbox Persisting:**
   - Evaluates the deterministic event fingerprint:
     `SHA-256(provider + ":" + tranId + ":" + valId + ":" + status + ":" + amount)`
   - Performs atomic upsert to `PaymentWebhookInbox`.
   - If the fingerprint already exists and was marked `processed`, returns `{ ok: true, alreadyProcessed: true }` immediately.
3. **Transaction Validation:**
   - If IPN reports `VALID` or `VALIDATED`, validates via `validateSslcommerzTransaction(val_id)`.
   - Compares expected order number, amount, and currency.
   - Settle order atomically.
4. **Gateway Failure/Cancellation IPNs:**
   - If IPN reports `FAILED` or `CANCELLED`, transitions attempt only if the attempt is not already `succeeded`.

---

## 4. Race Condition Resolution: Callback vs IPN

Because SSLCOMMERZ fires the customer redirect and the IPN at roughly the same time, a race condition naturally occurs.

### Resolution Mechanism:
Order payment settlement executes an atomic conditional update on MongoDB:
```ts
Order.findOneAndUpdate(
  {
    _id: orderId,
    paymentStatus: { $ne: "paid" }, // Atomic concurrency guard
  },
  {
    $set: {
      paymentStatus: "paid",
      paidAt: now,
      paidAmount: amount,
      paymentId: attemptId,
    },
  },
  { new: true }
);
```
- **Winner of the race:** Obtains the claimed order document, updates order status to `"processing"` (or `"on-hold"` if high risk), pushes to status history, and executes `commitStockForOrder()`.
- **Loser of the race:** Returns `null` on the atomic query, detects `order.paymentStatus === "paid"` (`alreadySettled === true`), and terminates cleanly without duplicating order confirmations or inventory deductions.
