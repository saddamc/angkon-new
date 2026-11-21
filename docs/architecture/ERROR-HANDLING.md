# Error Handling & Fault Recovery — ANGKON

## 1. Standardized Error Response Format

All API routes return structured, typed JSON error payloads:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "error": "Recipient phone must be a valid 11-digit Bangladeshi mobile number.",
  "details": {
    "field": "customer.phone",
    "received": "017"
  }
}
```

### Standard Error Codes
* `UNAUTHORIZED` (HTTP 401): Missing or expired authentication token.
* `FORBIDDEN` (HTTP 403): User lacks sufficient administrative permissions.
* `NOT_FOUND` (HTTP 404): Requested entity does not exist.
* `VALIDATION_ERROR` (HTTP 422): Request schema or data constraints failed.
* `CONFLICT` (HTTP 409): Concurrent modification or duplicate resource attempt.
* `RATE_LIMITED` (HTTP 429): Rate limit bucket exhausted.
* `GATEWAY_ERROR` (HTTP 502): External service (SSLCOMMERZ/Steadfast) returned an upstream error.
* `SERVICE_UNAVAILABLE` (HTTP 503): Service temporarily degraded or undergoing maintenance.

---

## 2. Gateway Timeout & Network Fault Recovery

### A. Payment Timeout Recovery
1. When SSLCOMMERZ checkout session creation times out, the attempt transitions to `failed` without affecting the customer's draft order.
2. If payment validation times out after customer charged, the payment remains in `pending` (never marked `failed`).
3. Scheduled reconciliation cron jobs query `/validator/api/merchantTransIDvalidationAPI.php` on an exponential backoff schedule to safely recover the result.

### B. Courier Timeout Recovery
1. If Steadfast `/create_order` times out or returns HTTP 5xx:
   - ANGKON queries Steadfast `/status_by_invoice/${orderNumber}` before failing or retrying.
   - If the consignment exists at Steadfast, ANGKON adopts the consignment ID and tracking code immediately, preventing duplicate shipments.
