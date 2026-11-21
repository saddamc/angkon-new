# ANGKON — Production-Grade Order, Payment & Steadfast Courier Workflow Specification

## 1. Executive Summary & Objective

This document specifies the unified architecture and production-grade implementation of **ANGKON's tripartite workflow system**. 

Previously in standard e-commerce implementations, order fulfillment, financial settlement, and courier tracking are frequently compressed into a single `status` column. This creates race conditions, erroneous financial reporting, and operational vulnerability.

In ANGKON's production system, three independent but harmonized operational lifecycles are maintained:
1. **Order Lifecycle (`orderStatus`)**: Internal merchant business operations.
2. **Payment Lifecycle (`paymentStatus`)**: Financial transactions, verified advance payments, and customer balances.
3. **Shipment Lifecycle (`shipmentStatus`)**: Physical parcel movement, courier sync, and milestone tracking.

---

## 2. Separate Status Architecture (Phase 1)

### A. Order Status (`orderStatus`)
Manages store operations and fulfillment states:
- `pending`: Newly placed order awaiting confirmation or advance payment.
- `confirmed`: Customer verified; items committed.
- `processing`: Order is being packed or customized.
- `ready_to_ship`: Parcel packed and labeled; ready for courier pickup.
- `shipped`: Authoritatively confirmed physically picked up / in transit with courier.
- `delivered`: Authoritatively confirmed delivered to customer.
- `cancelled`: Cancelled prior to courier dispatch.
- `returned`: Physical parcel returned to store inventory.

### B. Payment Status (`paymentStatus`)
Tracks cash and digital currency flows:
- `unpaid`: Zero payment received.
- `advance_pending`: Required advance payment initiated but unverified.
- `partially_paid`: Verified advance received; remaining balance due upon delivery.
- `paid`: Full amount verified (either full online or settled COD).
- `failed`: Payment gateway attempt failed.
- `refund_pending`: Return/refund requested; awaiting payout.
- `partially_refunded`: Partial amount refunded.
- `refunded`: Full order value refunded.

### C. Shipment Status (`shipmentStatus` & `providerStatus`)
Tracks logistics via canonical internal states and preserves raw courier strings:
- Canonical States: `not_booked`, `booking_pending`, `booking_failed`, `booked`, `pickup_pending`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `delivery_failed`, `return_initiated`, `returned`, `cancelled`, `unknown`.
- `providerStatus`: Exact string returned by Steadfast (e.g. `in_review`, `delivered_approval_pending`, `hold`).

---

## 3. The 3 Payment Arrangements & COD Calculation (Phases 6 & 7)

All calculations are enforced strictly on the backend via `computeOrderFinancials()`:
$$\text{codAmountToCollect} = \max(0, \text{total} - \text{verifiedPaidAmount})$$

| Arrangement | Order Total | Verified Online | Outstanding Due | Steadfast COD | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Full COD** | ৳2,000 | ৳0 | ৳2,000 | ৳2,000 | `unpaid` |
| **B. Advance + COD** | ৳2,000 | ৳500 | ৳1,500 | ৳1,500 | `partially_paid` |
| **C. Full Online** | ৳2,000 | ৳2,000 | ৳0 | ৳0 | `paid` |

*Security Rule:* Frontend-provided COD amounts are rejected. The server calculates the exact outstanding balance from verified ledger payments and line item charges. Zero-COD shipments are booked with `codAmount = 0`.

---

## 4. Automatic Steadfast Booking Workflow (Phase 2 & 5)

When an administrator triggers **Send to Steadfast**:
1. **Pre-flight Validation**: Verifies customer name, delivery address, and normalized 11-digit Bangladeshi mobile (`normalizeBdPhone`).
2. **Financial Verification**: Re-computes verified outstanding balance for COD submission.
3. **Duplicate Prevention**: Checks if `order.consignmentId` already exists. If previous attempt timed out, calls Steadfast invoice lookup endpoint first to prevent double-consignments.
4. **Booking Submission**: Dispatches payload to Steadfast API.
5. **State Transition on Success**:
   - `shipmentStatus = "booked"`
   - `shipmentBookingState = "booked"`
   - `providerStatus = raw_status`
   - `courierMode = "steadfast"`
   - `courierName = "Steadfast"`
   - `trackingUrl = generated_url`
   - `orderStatus = "ready_to_ship"` (if currently `confirmed` or `processing`).
   - **Crucial Rule:** Order status is **NEVER** marked as `shipped` on booking success!
6. **State Transition on Failure**:
   - `shipmentStatus = "booking_failed"`
   - `shipmentBookingState = "booking_failed"`
   - `courierBookingError = error_message`
   - `orderStatus` remains unaffected. Admin is shown error banner and retry action.

---

## 5. Courier Status Synchronization (Phase 3)

The synchronization engine (`applyCourierStatus`) ingests webhooks and scheduled polling updates:
- **Physical Pickup (`picked_up`, `in_transit`, `out_for_delivery`)**:
  - Automatically transitions `orderStatus` to `shipped`.
  - Sets `shipmentStatus` to canonical counterpart.
- **Delivered (`delivered`)**:
  - Sets `orderStatus = "delivered"`.
  - Sets `shipmentStatus = "delivered"`.
  - Records `collectedCodAmount = outstandingAmount`.
  - Sets `codSettlementStatus = "collected"`.
  - *Note:* Courier bank settlement (`codSettlementStatus = "settled"`) remains an independent financial reconciliation step.
- **Return (`return_initiated`, `returned`)**:
  - Sets `orderStatus = "returned"`.
  - Triggers stock reservation release back to catalog.
- **Anti-Regression & Terminal Guard**:
  - Delivered and Terminal Return states cannot be overwritten by delayed transit webhooks.

---

## 6. Manual Courier Mode (Mode B) & Overrides (Phase 4 & 5)

For store-operated delivery riders or alternative delivery services (Pathao, RedX, Paperfly, manual van):
1. **Mode B Configuration**:
   - Admin inputs: Courier Name, Rider Name & Phone, Manual Tracking Number, Pickup / Dispatch / Delivery dates, Delivery Notes.
2. **Transition Rules**:
   - Active Steadfast consignments must be explicitly cancelled with the courier before switching to Manual Courier.
   - Authorized administrators can manually advance shipment milestones (`picked_up`, `delivered`).
   - Every manual override records an audit record in `AdminAuditLog` with Admin ID, Timestamp, Previous State, New State, and Justification.

---

## 7. Admin UI Enhancements (Phases 8 & 9)

1. **Order Table**:
   - Partially paid orders clearly display: `Adv: ৳500 • COD: ৳1,500`.
   - Courier column displays provider logo, tracking code, consignment ID, and direct tracking link.
   - Failed bookings display an alert pill with retry action.
2. **Smart Order Status Dialog**:
   - Orders managed via Steadfast API show an active sync card with consignment ID and tracking link.
   - Manual `Shipped` and `Delivered` radio options are disabled with label `"Controlled by Steadfast API"`.
   - Internal operational statuses (`confirmed`, `processing`, `ready_to_ship`, `cancelled`) remain fully editable.
   - One-click "Sync Courier Status" button reconciles with courier in real-time.

---

## 8. Verification & Test Suite Matrix (Phase 11)

A complete 30-scenario test suite (`tests/orders-payment-courier-workflow.test.ts`) verifies all edge cases:
- **Scenarios 1-4**: Full COD, advance payment, partial payment, full online payment.
- **Scenarios 5-7**: Failed advance payments, unverified callbacks, and duplicate IPN idempotency.
- **Scenarios 8-11**: Steadfast booking success (ready to ship), booking failure, timeouts, duplicate prevention.
- **Scenarios 12-14**: Pickup (shipped), in-transit, and delivery success (COD collected).
- **Scenarios 15-18**: Delivery failure, customer parcel refusal, return initiated, return completed.
- **Scenarios 19-23**: Manual delivery mode, milestone updates, API override locking, authorized audit overrides.
- **Scenarios 24-27**: COD amount validation, advance payment math, zero-COD prepaid shipments, courier settlement pending.
- **Scenarios 28-30**: Duplicate webhook suppression, unknown courier responses, network sync recovery.

**Test Results Summary:**
- 30 / 30 automated scenarios passing (100% success rate).
- 45 / 45 payment integration tests passing.
- 19 / 19 checkout UX and policy tests passing.
- 0 TypeScript compilation errors (`tsc --noEmit`).
- Production build succeeded (`next build`).
