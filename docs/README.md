# ANGKON — Engineering Documentation

Authoritative documentation for the **ANGKON** Luxury E-Commerce platform, engineered with Next.js 16 (App Router), React 19, MongoDB Atlas, SSLCOMMERZ, and Steadfast Courier.

---

## Documentation Directory Map

### 1. Architecture
* [System Overview](./architecture/SYSTEM-OVERVIEW.md) — High-level system architecture, service interactions, and data flow.
* [Application Architecture](./architecture/APPLICATION-ARCHITECTURE.md) — Frontend component structure, server actions, API routes, and state management.
* [Database Architecture](./architecture/DATABASE-ARCHITECTURE.md) — MongoDB schemas, collections, indexes, and relationship mapping.
* [Security Architecture](./architecture/SECURITY-ARCHITECTURE.md) — Authentication, RBAC, HMAC webhook verification, rate limiting, and data protection.
* [Error Handling](./architecture/ERROR-HANDLING.md) — Standardized API error format, retry strategies, and fault recovery.

### 2. External Integrations
* [SSLCOMMERZ Integration](./integrations/SSLCOMMERZ.md) — Hosted gateway integration, transaction query, session initiation, and server validation.
* [Steadfast Courier Integration](./integrations/STEADFAST.md) — Direct API integration, consignment creation, and status polling.
* [Cloudinary Integration](./integrations/CLOUDINARY.md) — Media asset storage, dynamic resizing, optimization, and upload security.

### 3. Payment System
* [Payment Lifecycle](./payments/PAYMENT-LIFECYCLE.md) — End-to-end payment lifecycle from order creation to final settlement.
* [Payment State Machine](./payments/PAYMENT-STATE-MACHINE.md) — Formal 3D state machine, transition guards, and invariants.
* [Failure Recovery & Reconciliation](./payments/FAILURE-RECOVERY.md) — Abandoned transaction recovery, IPN polling, and reconciliation cron jobs.
* [Refund Process](./payments/REFUND-PROCESS.md) — Partial and full refund workflow, balance reconciliation, and audit logs.

### 4. Courier & Logistics
* [Courier Lifecycle](./courier/COURIER-LIFECYCLE.md) — Delivery operations, COD calculation, and consignment tracking.
* [Mock & Live Modes](./courier/MOCK-AND-LIVE-MODES.md) — Strict separation between development mock provider and production live API.
* [Tracking & Returns](./courier/TRACKING-AND-RETURNS.md) — Real-time tracking synchronization, return processing, and webhook events.

### 5. Operations & Runbooks
* [Environment Setup](./operations/ENVIRONMENT-SETUP.md) — Required environment variables, secrets, and validation.
* [Local Development](./operations/LOCAL-DEVELOPMENT.md) — Prerequisites, development setup, and test runner instructions.
* [Staging Deployment](./operations/STAGING-DEPLOYMENT.md) — Staging environment setup, testing matrix, and verification.
* [Production Deployment](./operations/PRODUCTION-DEPLOYMENT.md) — Production deployment runbook, Vercel configuration, and health checks.
* [Backup & Restore](./operations/BACKUP-AND-RESTORE.md) — Database backup strategies, Atlas point-in-time recovery, and restore drills.
* [Troubleshooting & Diagnostics](./operations/TROUBLESHOOTING.md) — Common error resolution, diagnostics probes, and debugging guides.
* [Incident Recovery](./operations/INCIDENT-RECOVERY.md) — Emergency playbooks for payment gateway outages, courier API downtime, and failovers.

### 6. Testing & Quality
* [Testing Strategy](./testing/TESTING-STRATEGY.md) — Unit, integration, end-to-end testing policies, and CI quality gates.
* [Sandbox Testing Guide](./testing/SANDBOX-TESTING.md) — SSLCOMMERZ sandbox test cards and Steadfast simulated scenarios.
* [Release Checklist](./testing/RELEASE-CHECKLIST.md) — Step-by-step pre-flight checklist for production releases.
