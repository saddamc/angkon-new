/**
 * Read-only sandbox readiness probe.
 *
 * Checks that credentials are present (never prints values), that the
 * checkout/admin/payment endpoints are wired, and that a spoofed payment
 * return cannot mark an order paid. It does NOT create orders or shipments.
 *
 * Usage:
 *   node scripts/sandbox/probe-integrations.mjs
 *   node scripts/sandbox/probe-integrations.mjs --base http://localhost:3001
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
    }
  }
}

loadEnv();

const baseArg = process.argv.indexOf("--base");
const base = (baseArg >= 0 ? process.argv[baseArg + 1] : "http://localhost:3001").replace(/\/$/, "");

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function present(name) {
  return Boolean((process.env[name] || "").trim());
}

function adminToken() {
  const secret = (process.env.JWT_SECRET || "").trim();
  if (!secret) return "";
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "sandbox-probe",
      name: "Sandbox Probe",
      role: "superadmin",
      authorizedTenants: [(process.env.PRIMARY_TENANT_ID || "angkon-main").trim()],
      defaultTenant: (process.env.PRIMARY_TENANT_ID || "angkon-main").trim(),
      iat: now,
      exp: now + 600,
    })
  ).toString("base64");
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64");
  return `${data}.${sig}`;
}

async function main() {
  console.log(`Sandbox probe → ${base}\n`);

  // 1. Credential presence (never values)
  record("JWT_SECRET present", present("JWT_SECRET"), present("JWT_SECRET") ? "" : "required in production");
  record("CRON_SECRET present", present("CRON_SECRET"), present("CRON_SECRET") ? "" : "crons will return 503");
  record(
    "SSLCOMMERZ credentials present",
    present("SSLCOMMERZ_STORE_ID") && present("SSLCOMMERZ_STORE_PASSWORD"),
    present("SSLCOMMERZ_STORE_ID") ? "" : "online payment stays disabled"
  );
  record(
    "Steadfast credentials present",
    present("STEADFAST_API_KEY") && present("STEADFAST_SECRET_KEY"),
    present("STEADFAST_API_KEY") ? "" : "shipment create returns 503"
  );
  record(
    "Steadfast webhook secret present",
    present("STEADFAST_WEBHOOK_SECRET"),
    present("STEADFAST_WEBHOOK_SECRET") ? "" : "webhook returns 503 (refresh still works)"
  );
  record(
    "Pathao credentials present (optional)",
    present("PATHAO_CLIENT_ID") && present("PATHAO_CLIENT_SECRET"),
    present("PATHAO_CLIENT_ID") ? "" : "Pathao adapter remains inactive"
  );

  // 2. Checkout config
  const configRes = await fetch(`${base}/api/checkout/config`);
  const config = await configRes.json().catch(() => ({}));
  record("GET /api/checkout/config", configRes.status === 200);
  record(
    "onlinePaymentAvailable matches credentials",
    Boolean(config.onlinePaymentAvailable) ===
      (present("SSLCOMMERZ_STORE_ID") && present("SSLCOMMERZ_STORE_PASSWORD")),
    `onlinePaymentAvailable=${Boolean(config.onlinePaymentAvailable)}`
  );

  // 3. Admin auth
  const token = adminToken();
  if (!token) {
    record("admin token minted", false, "JWT_SECRET missing");
    return finish();
  }
  const guest = await fetch(`${base}/api/admin/orders`);
  record("admin orders rejects a guest", guest.status === 401, `HTTP ${guest.status}`);

  const adminRes = await fetch(`${base}/api/admin/orders?per_page=5`, {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  const adminBody = await adminRes.json().catch(() => ({}));
  const orders = Array.isArray(adminBody.orders) ? adminBody.orders : [];
  record("admin orders accepts a superadmin", adminRes.status === 200, `HTTP ${adminRes.status}, ${orders.length} order(s)`);

  const sample = orders[0];
  if (!sample) {
    record("sample order available", false, "no orders in the database");
    return finish();
  }
  const orderNumber = String(sample.number || sample.id);

  // 4. Payment timeline + shipment panel
  const paymentsRes = await fetch(`${base}/api/admin/orders/${encodeURIComponent(orderNumber)}/payments`, {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  const paymentsBody = await paymentsRes.json().catch(() => ({}));
  record(
    "payment timeline endpoint",
    paymentsRes.status === 200,
    `HTTP ${paymentsRes.status}, ${Array.isArray(paymentsBody.payments) ? paymentsBody.payments.length : 0} attempt(s)`
  );

  const shipmentRes = await fetch(`${base}/api/admin/orders/${encodeURIComponent(orderNumber)}/shipment`, {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  const shipmentBody = await shipmentRes.json().catch(() => ({}));
  record(
    "shipment endpoint",
    shipmentRes.status === 200,
    `HTTP ${shipmentRes.status}, configured=${Boolean(shipmentBody.configured)}`
  );

  // 5. Reconciliation dry-run (read-only: no gateway calls, no writes)
  const cronSecret = (process.env.CRON_SECRET || process.env.JWT_SECRET || "").trim();
  const reconcileRes = await fetch(
    `${base}/api/payments/reconcile?dryRun=1&key=${encodeURIComponent(cronSecret)}`
  );
  const reconcileBody = await reconcileRes.json().catch(() => ({}));
  record(
    "reconciliation dry-run",
    reconcileRes.status === 200 && reconcileBody.ok === true && typeof reconcileBody.scanned === "number",
    `HTTP ${reconcileRes.status}, scanned=${reconcileBody.scanned ?? "?"}, pending=${reconcileBody.pending ?? "?"}, skipped=${reconcileBody.skipped ?? "?"}, failed=${reconcileBody.failed ?? "?"}, terminalFailed=${reconcileBody.terminalFailed ?? "?"}, failedWebhooks=${reconcileBody.failedWebhooks ?? "?"}`
  );

  // 6. Spoofed return cannot pay an order
  const spoof = await fetch(
    `${base}/api/payment/sslcommerz/callback?status=success&tran_id=${encodeURIComponent(orderNumber)}`,
    { redirect: "manual" }
  );
  const location = spoof.headers.get("location") || "";
  record(
    "redirect-only payment spoof is rejected",
    spoof.status >= 300 && spoof.status < 400 && !location.includes("payment=success"),
    `HTTP ${spoof.status} → ${location.replace(base, "") || "(no location)"}`
  );

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.ok);
  console.log("");
  if (failed.length === 0) {
    console.log(`All ${results.length} checks passed.`);
  } else {
    console.log(`${failed.length} of ${results.length} checks need attention:`);
    for (const row of failed) console.log(`  - ${row.name}${row.detail ? ` (${row.detail})` : ""}`);
  }
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("Probe failed:", error.message);
  process.exitCode = 1;
});
