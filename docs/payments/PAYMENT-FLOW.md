# ANGKON Payment Flows & Sequence Architecture

This document provides sequence diagrams and walkthroughs for the ANGKON payment integration with SSLCOMMERZ Hosted Gateway.

---

## 1. Happy Path: Online Payment Checkout & Confirmation

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Browser
    participant API as ANGKON Next.js Server
    participant DB as MongoDB
    participant SSL as SSLCOMMERZ Gateway
    participant Bank as Customer Bank / MFS

    Customer->>API: POST /api/payments/sslcommerz/initiate { orderNumber }
    API->>DB: Recalculate price & check stock (Product collection)
    API->>DB: Create PaymentAttempt ('created' -> 'initiating')
    API->>SSL: POST /gwprocess/v4/api.php (Session Initiation)
    SSL-->>API: 200 OK { status: 'SUCCESS', GatewayPageURL, sessionkey }
    API->>DB: Update PaymentAttempt ('pending', customerActivity: 'redirected')
    API-->>Customer: 200 OK { gatewayUrl: GatewayPageURL }
    
    Customer->>SSL: Browser Redirected to SSLCOMMERZ Hosted Portal
    Customer->>Bank: Authenticates & Authorizes PIN / OTP
    Bank-->>SSL: Payment Approved

    par Customer Browser Redirect
        SSL->>Customer: 302 Redirect to /api/payments/sslcommerz/success
        Customer->>API: POST /api/payments/sslcommerz/success (formData: val_id, tran_id)
        API->>SSL: GET /validator/api/validationserverAPI.php?val_id=...
        SSL-->>API: 200 OK { status: 'VALID', amount, currency, risk_level: '0' }
        API->>DB: Settle Order ('paid') & PaymentAttempt ('succeeded') [Atomic]
        API->>DB: Commit Reserved Stock (commitStockForOrder)
        API-->>Customer: 303 Redirect to /checkout/payment-status/[attemptId]
    and Server-to-Server Webhook (IPN)
        SSL->>API: POST /api/payments/sslcommerz/ipn (formData)
        API->>DB: Record in PaymentWebhookInbox (SHA-256 fingerprint)
        API->>DB: Atomic settlement check -> alreadySettled === true
        API-->>SSL: 200 OK { ok: true, alreadyProcessed: true }
    end
```

---

## 2. Early IPN Arrival Flow (IPN Arrives Before Customer Browser)

When network latency delays the customer's browser redirect:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Browser
    participant API as ANGKON Next.js Server
    participant DB as MongoDB
    participant SSL as SSLCOMMERZ Gateway

    SSL->>API: POST /api/payments/sslcommerz/ipn (formData: val_id)
    API->>DB: Record in PaymentWebhookInbox
    API->>SSL: Validate via /validator/api/validationserverAPI.php
    SSL-->>API: 200 OK { status: 'VALID' }
    API->>DB: Settle Order to 'paid' & commit stock
    API-->>SSL: 200 OK

    Note over Customer,API: Customer browser returns 5 seconds later
    Customer->>API: POST /api/payments/sslcommerz/success
    API->>DB: Check Order status
    Note over API,DB: Detects paymentStatus === 'paid' (alreadySettled)
    API-->>Customer: 303 Redirect to /checkout/payment-status/[attemptId] (Success Screen)
```

---

## 3. Customer Abandonment & Internet Loss Recovery Flow

When the customer closes the browser tab or loses connection during checkout:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer
    participant API as ANGKON Next.js Server
    participant DB as MongoDB
    participant Reconciler as Reconcile Job (Cron)
    participant SSL as SSLCOMMERZ Gateway

    Customer->>SSL: Enters SSLCOMMERZ portal
    Note over Customer: Closes browser or loses connection
    Note over DB: customerActivity = 'no_return_detected', status = 'pending'

    Note over Reconciler: Inactivity threshold exceeded (5 minutes)
    Reconciler->>DB: Query eligible pending attempts (findEligibleForReconciliation)
    Reconciler->>SSL: GET /validator/api/merchantTransIDvalidationAPI.php?tran_id=...

    alt Gateway confirms payment VALID
        SSL-->>Reconciler: 200 OK { status: 'VALID', val_id: '...' }
        Reconciler->>DB: Settle order to 'paid', commit stock, mark 'succeeded'
    else Gateway confirms FAILED / CANCELLED
        SSL-->>Reconciler: 200 OK { status: 'FAILED' }
        Reconciler->>DB: Mark attempt 'failed', restore stock
    else Gateway has no record (Unattempted)
        Note over Reconciler: Schedule next check (+2m, +5m, +10m, +30m, +1h, +2h)
        alt Session age > 4 hours
            Reconciler->>DB: Mark attempt 'expired', release stock
        end
    end
```
