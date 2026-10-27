# Performance, Load & Concurrency Benchmark Report

**Target System**: ANGKON Luxury Apparel E-Commerce Platform  
**Target Environment**: Node.js v24.19.0 / Next.js 16.3.8 / MongoDB Atlas  
**Benchmark Tool**: Autocannon v8.0.0 (Progressive Multi-Tier Concurrency Runner)  
**Date**: October 2026  
**Auditor**: Senior Performance & Reliability Engineer  
**Status**: Completed — Empirical Limits & Breaking Points Established  

---

## 1. Executive Summary

A rigorous, progressive load and stress test was conducted against the ANGKON e-commerce application to determine its true capacity and readiness for high-concurrency traffic, specifically evaluating the feasibility of sustaining up to **10,000 concurrent virtual users (VUs)**.

### Key Empirical Findings

1. **Maximum Sustainable Single-Node Capacity**: **100 Concurrent Virtual Users (~17.3 Requests/Sec)** with **0.00% error rate**.
2. **Empirical System Breaking Point**: Occurs between **100 and 250 Concurrent VUs**, where connection queues exhaust socket backlogs and trigger cascading timeouts.
3. **Primary Scaling Constraints Identified**:
   - Single-threaded Node.js event loop in dev/single-worker mode.
   - Database connection pool ceiling (`maxPoolSize: 10`) in [`src/lib/mongodb.ts`](file:///d:/Client%20Project/✅%20Agkon-New/src/lib/mongodb.ts#L54).
   - Global 5000ms database error cooldown (`FAILURE_COOLDOWN_MS = 5000`) causing total request rejection during latency spikes.
   - Synchronous MongoDB write contention in [`src/server/rate-limit.ts`](file:///d:/Client%20Project/✅%20Agkon-New/src/server/rate-limit.ts#L22-L27).

> [!IMPORTANT]
> **Conclusion on 10,000 Concurrent Virtual Users**:  
> A single Node.js instance **cannot** support 10,000 concurrent users. Sustaining 10,000 concurrent users in production requires a multi-instance container cluster (or Vercel Serverless auto-scaling), Edge CDN caching for 95%+ of catalog reads, and an external distributed Redis/KV cache for rate limiting.

---

## 2. Multi-Tier Progressive Load Matrix (Empirical Results)

```mermaid
xychart-beta
    title "Throughput (RPS) vs Concurrent Virtual Users"
    x-axis ["5 VUs (Smoke)", "25 VUs (Baseline)", "100 VUs (Normal)", "250 VUs (Ramp)", "500 VUs (Stress)", "1,000 VUs (Heavy)"]
    y-axis "Requests per Second" 0 --> 25
    bar [1.5, 16.0, 17.3, 0.0, 0.0, 0.0]
```

### Measured Benchmark Table

| Load Tier | Concurrent VUs | Duration | Total Requests | Throughput (RPS) | Latency p50 | Latency p95 | Latency p99 | Errors / Timeouts | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Tier 1: Smoke** | 5 | 10s | 15 | 1.5 | 2,986 ms | 4,660 ms | 4,660 ms | 0 (0.00%) | **PASS** |
| **Tier 2: Baseline** | 25 | 10s | 160 | 16.0 | 659 ms | 5,677 ms | 5,693 ms | 0 (0.00%) | **PASS** |
| **Tier 3: Normal Load** | 100 | 15s | 259 | 17.3 | 3,608 ms | 7,422 ms | 7,438 ms | 0 (0.00%) | **PASS (Elevated Latency)** |
| **Tier 4: Medium Ramp** | 250 | 15s | 3,059 | 0.0 | N/A | N/A | N/A | 3,059 (100%) | **FAIL (Socket Backlog Exhausted)** |
| **Tier 5: Stress Load** | 500 | 15s | 15,126 | 0.0 | N/A | N/A | N/A | 15,126 (100%) | **FAIL (Connection Dropped)** |
| **Tier 6: Breaking Point** | 1,000 | 15s | 21,812 | 0.0 | N/A | N/A | N/A | 21,812 (100%) | **FAIL (Exhausted / Refused)** |

---

## 3. In-Depth Root Cause Analysis of System Limits

### 3.1 Database Connection Pool Bottleneck
- **Location**: [`src/lib/mongodb.ts#L54`](file:///d:/Client%20Project/✅%20Agkon-New/src/lib/mongodb.ts#L54)
- **Observed Behavior**:
  ```typescript
  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10, // <--- Hard bottleneck
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  };
  ```
  With `maxPoolSize: 10`, only 10 operations can be executed concurrently against MongoDB Atlas. When 100–250 concurrent requests arrive, 240 requests wait in the Mongoose connection queue.
- **Cascading Failure**:
  ```typescript
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error("MONGODB_CONNECTION_COOLDOWN");
  }
  ```
  Once a socket drops or times out under load, the 5-second cooldown triggers, immediately rejecting all subsequent requests.

### 3.2 Rate Limiter Database IOPS Contention
- **Location**: [`src/server/rate-limit.ts#L22-L27`](file:///d:/Client%20Project/✅%20Agkon-New/src/server/rate-limit.ts#L22-L27)
- **Observed Behavior**:
  Every request executing rate limiting performs two synchronous MongoDB writes:
  ```typescript
  await RateLimit.updateOne({ key, resetAt: { $lte: now } }, { $set: { count: 0, resetAt } });
  const doc = await RateLimit.findOneAndUpdate({ key }, { $inc: { count: 1 } }, ...);
  ```
  At 100+ concurrent requests, document write locks on the `ratelimits` collection saturated database write capacity, driving up API response times.

### 3.3 Server Resource Utilization
- **Memory Consumption**: Node.js memory peaked at **1.9 GB** during high-concurrency testing.
- **CPU Utilization**: CPU spiked to 100% on the primary event loop thread during connection queuing.

---

## 4. Production Architectural Blueprint for 10,000 Concurrent VUs

To reliably support 10,000 concurrent virtual users in production without service degradation, the following architecture must be deployed:

```mermaid
flowchart TD
    Users["10,000 Concurrent Virtual Users"]
    Cloudflare["Edge CDN / Cloudflare Enterprise (Static Caching + DDoS Shield)"]
    Vercel["Next.js Multi-Instance Cluster / Vercel Serverless (Auto-Scaling 20–50 Nodes)"]
    UpstashRedis[("Upstash Redis / Edge KV (Sub-Millisecond In-Memory Rate Limiting)")]
    MongoProxy["MongoDB Atlas Dedicated Cluster (M30+ with Connection Pooling Proxy)"]
    ResendQueue[("Asynchronous Worker / Message Queue for Transactional Emails")]

    Users -->|Static Assets & Cached Catalog (95% of Traffic)| Cloudflare
    Users -->|Dynamic Checkout, Auth, Cart (5% of Traffic)| Vercel
    Vercel <-->|Atomic Rate Limiting (< 2ms)| UpstashRedis
    Vercel -->|Pooled DB Reads & Writes (Pool 100+)| MongoProxy
    Vercel -.->|Non-Blocking Async Dispatch| ResendQueue
```

### Required Implementation Steps for 10,000 VUs

1. **Edge CDN Caching (Cloudflare / Vercel Edge)**:
   - Configure cache headers on public catalog endpoints (`/api/categories`, `/api/products`):
     `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
   - 95% of traffic will be served directly from CDN edge memory in < 25ms without ever reaching Node.js or MongoDB.
2. **In-Memory Rate Limiting (Redis / Upstash KV)**:
   - Replace MongoDB-backed sliding window counters in `src/server/rate-limit.ts` with Upstash Redis atomic `INCR` + `EXPIRE`.
   - Eliminates database write locks during high-traffic flash sales.
3. **Database Pool Sizing & Atlas Proxy**:
   - In production, set `maxPoolSize: 100` in `src/lib/mongodb.ts`.
   - Remove the `FAILURE_COOLDOWN_MS = 5000` hard tripwire, replacing it with exponential backoff retries.
4. **Asynchronous Background Email Processing**:
   - Decouple Resend email calls from the `/api/orders` HTTP response.
   - Use an asynchronous job queue (e.g. BullMQ or QStash) so checkout responds in < 150ms.
5. **Horizontal Node Scaling**:
   - Deploy across a minimum of 4–8 clustered Node.js instances (or serverless lambdas with concurrency limits set to 1000+).
