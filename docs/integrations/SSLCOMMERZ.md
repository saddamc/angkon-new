# SSLCOMMERZ Integration Guide

> [!IMPORTANT]
> **Consolidated Authoritative Documentation:**
> All technical specifications, gateway endpoints, security invariants, callback handling, and environment rules for SSLCOMMERZ are maintained in the authoritative document:
> **[`docs/payments/SSLCOMMERZ-INTEGRATION.md`](../payments/SSLCOMMERZ-INTEGRATION.md)**

---

## Quick Reference & Direct Links

| Topic | Authoritative Document |
|---|---|
| **Gateway Integration & Configuration** | [`docs/payments/SSLCOMMERZ-INTEGRATION.md`](../payments/SSLCOMMERZ-INTEGRATION.md) |
| **Payment Lifecycle & 16 Scenarios** | [`docs/payments/PAYMENT-LIFECYCLE.md`](../payments/PAYMENT-LIFECYCLE.md) |
| **Payment State Machine & Transitions** | [`docs/payments/PAYMENT-STATE-MACHINE.md`](../payments/PAYMENT-STATE-MACHINE.md) |
| **Deployment & Production Runbook** | [`docs/payments/DEPLOYMENT-RUNBOOK.md`](../payments/DEPLOYMENT-RUNBOOK.md) |

---

## Gateway Endpoints Summary

- **Live Base URL:** `https://securepay.sslcommerz.com`
- **Sandbox Base URL:** `https://sandbox.sslcommerz.com`
- **Session Initiation:** `POST /gwprocess/v4/api.php`
- **Validation Server API:** `GET /validator/api/validationserverAPI.php`
- **Merchant Query API:** `GET /validator/api/merchantTransIDvalidationAPI.php`

For complete implementation details, validation flows, and IPN deduplication logic, refer to the [SSLCOMMERZ Integration Guide](../payments/SSLCOMMERZ-INTEGRATION.md).
