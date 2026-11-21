# ANGKON Payment Architecture & SSLCOMMERZ Integration

Welcome to the production payment architecture documentation for **ANGKON**.

This payment module provides an enterprise-grade, recoverable, and secure integration with the **SSLCOMMERZ Hosted Payment Gateway**, engineered natively for Next.js App Router and MongoDB without any external Redis dependency.

---

## Key Architectural Principles

1. **Zero External Cache Dependency:**
   - Distributed rate limiting is implemented natively via MongoDB atomic `$inc` with TTL indexing in the `RateLimitBucket` collection.
   - Idempotency and webhook deduplication are stored in MongoDB with deterministic SHA-256 fingerprinting.

2. **Server-Side Validation Mandate:**
   - Browser callbacks are treated as untrusted notifications.
   - Payment status is only confirmed (`paid`) after direct server-to-server validation via the official SSLCOMMERZ Validation API (`/validator/api/validationserverAPI.php`).

3. **Three-Dimensional State Management:**
   - **Payment Status:** `created` → `initiating` → `pending` → `succeeded` / `failed` / `cancelled` / `expired` / `unknown` / `review_required` / `refunded` / `partially_refunded`.
   - **Customer Activity:** `not_redirected`, `redirected`, `returned_success`, `returned_failed`, `returned_cancelled`, `no_return_detected`.
   - **Reconciliation Status:** `not_required`, `scheduled`, `processing`, `resolved`, `manual_review`.

4. **Immutable Success Guard (No-Downgrade Rule):**
   - A `succeeded` payment attempt can never be overwritten by late failure notifications, browser cancellation, or network timeouts.

5. **Strict Single-Commit Inventory Settlement:**
   - Stock deduction (`commitStockForOrder`) executes strictly once upon payment confirmation via atomic conditional queries (`{ _id, paymentStatus: { $ne: "paid" } }`).

6. **Complete Financial Record Separation:**
   - `Order`, `PaymentAttempt`, and `PaymentRefund` are tracked as independent models. A refund request never destroys the historical audit trail of the original successful capture.

---

## Documentation Index

1. [Architecture Design & Directory Organization](./ARCHITECTURE.md)
2. [End-to-End Payment Flow & Sequence Diagrams](./PAYMENT-FLOW.md)
3. [Payment State Machine & Transition Rules](./PAYMENT-STATE-MACHINE.md)
4. [Official SSLCOMMERZ API Reference](./SSLCOMMERZ-API-REFERENCE.md)
5. [Database Schema, Collections & Indexes](./DATABASE-SCHEMA.md)
6. [Callback and IPN Webhook Processing](./CALLBACK-AND-IPN.md)
7. [Failure Recovery & Inactivity Policies](./FAILURE-RECOVERY.md)
8. [Scheduled Payment Reconciliation Engine](./PAYMENT-RECONCILIATION.md)
9. [Payment Refund Process & Lifecycle](./REFUND-PROCESS.md)
10. [Payment Security Model & Threat Mitigations](./SECURITY-AND-THREATS.md)
11. [Local Sandbox Setup & Testing Cards](./LOCAL-SANDBOX-SETUP.md)
12. [Testing Guide & Automated Test Matrix](./TESTING-GUIDE.md)
13. [Production Deployment Runbook](./DEPLOYMENT-RUNBOOK.md)
14. [Payment Troubleshooting & Diagnostics](./TROUBLESHOOTING.md)
