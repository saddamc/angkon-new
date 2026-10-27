#!/usr/bin/env node
/**
 * ANGKON Multi-Tier Progressive Load & Stress Benchmark Runner
 * Measures Requests/Sec, Latency Percentiles (p50, p90, p95, p99), HTTP Statuses & Errors.
 */

import autocannon from "autocannon";

const BASE_URL = process.env.LOAD_TARGET_URL || "http://localhost:3001";

const TIERS = [
  { name: "Tier 1: Smoke Test", connections: 5, duration: 10, title: "Smoke (5 VUs)" },
  { name: "Tier 2: Baseline Load", connections: 25, duration: 10, title: "Baseline (25 VUs)" },
  { name: "Tier 3: Normal Load", connections: 100, duration: 15, title: "Normal (100 VUs)" },
  { name: "Tier 4: Medium Ramp", connections: 250, duration: 15, title: "Ramp (250 VUs)" },
  { name: "Tier 5: Stress Load", connections: 500, duration: 15, title: "Stress (500 VUs)" },
  { name: "Tier 6: Breaking Point", connections: 1000, duration: 15, title: "Heavy Stress (1,000 VUs)" },
];

const REQUESTS = [
  { method: "GET", path: "/api/categories", weight: 4 },
  { method: "GET", path: "/api/products?perPage=12", weight: 3 },
  {
    method: "POST",
    path: "/api/shipping/quote",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      district: "Dhaka",
      items: [{ productId: 228008, price: 8800, quantity: 1 }],
    }),
    weight: 2,
  },
  { method: "GET", path: "/", weight: 1 },
];

async function runTier(tier) {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting ${tier.name} — ${tier.connections} VUs for ${tier.duration}s`);
  console.log(`======================================================`);

  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: BASE_URL,
        connections: tier.connections,
        duration: tier.duration,
        pipelining: 1,
        requests: REQUESTS,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function formatResult(tier, res) {
  const p50 = res.latency.p50 ?? 0;
  const p90 = res.latency.p90 ?? 0;
  const p95 = res.latency.p95 ?? res.latency.p97_5 ?? 0;
  const p99 = res.latency.p99 ?? 0;
  const rps = res.requests.average ?? 0;
  const totalReqs = res.requests.total ?? 0;
  const errors = (res.errors ?? 0) + (res.timeouts ?? 0) + (res.non2xx ?? 0);
  const errorRate = totalReqs > 0 ? ((errors / totalReqs) * 100).toFixed(2) : "0.00";

  return {
    tier: tier.title,
    vus: tier.connections,
    totalRequests: totalReqs,
    rps: rps.toFixed(1),
    p50: `${p50}ms`,
    p90: `${p90}ms`,
    p95: `${p95}ms`,
    p99: `${p99}ms`,
    errors: `${errors} (${errorRate}%)`,
    status: Number(errorRate) < 1.0 ? "PASS" : "WARN/FAIL",
  };
}

async function main() {
  console.log(`Target Host: ${BASE_URL}`);
  console.log(`Progressive Load Benchmark starting...\n`);

  const results = [];

  for (const tier of TIERS) {
    try {
      const res = await runTier(tier);
      const summary = formatResult(tier, res);
      results.push(summary);

      console.log(`\nResults for ${tier.name}:`);
      console.log(`  Requests/Sec: ${summary.rps}`);
      console.log(`  Latency: p50: ${summary.p50} | p95: ${summary.p95} | p99: ${summary.p99}`);
      console.log(`  Errors / Timeouts: ${summary.errors}`);
      console.log(`  Outcome: ${summary.status}\n`);

      // Cooldown between tiers
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Error during ${tier.name}:`, err.message);
      results.push({
        tier: tier.title,
        vus: tier.connections,
        totalRequests: 0,
        rps: "0",
        p50: "N/A",
        p90: "N/A",
        p95: "N/A",
        p99: "N/A",
        errors: `Aborted: ${err.message}`,
        status: "FAIL",
      });
      break;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 FINAL LOAD & PERFORMANCE AUDIT MATRIX`);
  console.log(`======================================================\n`);
  console.table(results);

  // Print as Markdown
  console.log("\n### Markdown Summary Table\n");
  console.log("| Load Tier | Concurrent VUs | Total Reqs | Requests/Sec | Latency p50 | Latency p95 | Latency p99 | Errors / Non-2xx | Result |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    console.log(`| **${r.tier}** | ${r.vus} | ${r.totalRequests} | ${r.rps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.errors} | **${r.status}** |`);
  }
}

main().catch(console.error);
