# Admin Payment Operations Guide

This guide describes how administrators monitor, inspect, and manage payments in the ANGKON Admin Portal.

---

## 1. Accessing Payment Operations

Navigate to:
```
/admin/payments
```
*(Requires administrative authentication).*

### Dashboard KPIs
The top KPI cards provide real-time counts across the database:
- **Total Volume:** Sum of all successfully captured transactions in BDT.
- **Succeeded:** Total confirmed paid transactions.
- **Pending / In-Flight:** Transactions currently at the gateway or awaiting reconciliation.
- **Under Review:** Transactions flagged by the risk engine (`risk_level: "1"`) or with amount discrepancies.
- **Failed / Cancelled:** Unsuccessful or customer-cancelled attempts.

---

## 2. Searching and Filtering

Use the top filter tabs to isolate attempts by status:
- `All`
- `Succeeded`
- `Pending`
- `Review Required`
- `Failed`
- `Cancelled`

The search bar allows querying by:
- Order Number (e.g., `ANG-261120-1001`)
- Transaction ID (`tranId`)
- Validation ID (`valId`)
- Card Brand / Method (e.g., `BKASH`, `VISA`, `MASTERCARD`)

---

## 3. Inspecting a Payment Attempt

Clicking **"Inspect"** opens:
```
/admin/payments/[attemptId]
```

### Components of the Inspection Screen:
1. **Transaction Overview:** Displays expected amount, charged amount, attempt number, validation ID, bank transaction ID, card type, and environment (sandbox vs live).
2. **Customer & Order Panel:** Linked order status, customer name, phone number, customer activity, and reconciliation status.
3. **Gateway Security & Risk:** Risk level badge (Level 0 Safe vs Level 1 High Risk), gateway status, failure reason.
4. **Chronological Audit Timeline:** Step-by-step history of every event emitted for this attempt from the append-only `PaymentEvent` collection (`payment_initiation_started` → `customer_redirected` → `validation_started` → `payment_confirmed`).
5. **Raw Gateway Response:** Full sanitized response received from SSLCOMMERZ during validation (passwords and sensitive CVVs redacted).

---

## 4. Handling High-Risk Payments

When an attempt has status `review_required` (Risk Level 1):
1. Review the customer phone number and shipping address.
2. Confirm the bank card brand and issuing bank.
3. If legitimate, update the order status in `/admin/orders/[orderId]` from `on-hold` to `processing`.
4. If suspected fraud, initiate a refund or mark the order `cancelled`.
