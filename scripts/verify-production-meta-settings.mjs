import { chromium } from "playwright";
import fs from "fs";
import path from "path";

// Read real JWT_SECRET from .env
const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";
const artifactDir = "C:\\Users\\Saddam\\.gemini\\antigravity\\brain\\2f2026a3-862e-43f4-b897-3e7a83158b5f";

async function createSuperadminToken() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["primary_store", "angkon-main"],
    defaultTenant: "primary_store",
    exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
  };
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function run() {
  const token = await createSuperadminToken();

  console.log("\n================ API VERIFICATION ================");

  // 1. Verify GET /api/admin/meta/ads/credentials (Fix Priority 1)
  console.log("Checking GET /api/admin/meta/ads/credentials...");
  const adsCredsRes = await fetch("http://localhost:3001/api/admin/meta/ads/credentials", {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("Status:", adsCredsRes.status, adsCredsRes.statusText);
  const adsCredsJson = await adsCredsRes.json();
  console.log("Ads Credentials Response:", JSON.stringify(adsCredsJson, null, 2));

  // 2. Verify PUT /api/admin/meta/ads/credentials returns HTTP 405 Method Not Allowed
  console.log("\nChecking PUT /api/admin/meta/ads/credentials (Unsupported Method)...");
  const putRes = await fetch("http://localhost:3001/api/admin/meta/ads/credentials", {
    method: "PUT",
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("PUT Status:", putRes.status, putRes.statusText, "(Expected 405 Method Not Allowed)");

  // 3. Verify Domain Verification /check (Priority 3)
  console.log("\nChecking GET /api/admin/meta/domain-verification/check...");
  const domainRes = await fetch("http://localhost:3001/api/admin/meta/domain-verification/check", {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("Domain Status:", domainRes.status);
  const domainJson = await domainRes.json();
  console.log("Domain verified property:", domainJson.verified);
  console.log("Domain metaOwnershipStatus:", domainJson.metaOwnershipStatus);
  console.log("Domain lifecycleState:", domainJson.lifecycleState);

  // 4. Verify Centralized Settings /api/admin/meta/settings (Priority 6)
  console.log("\nChecking GET /api/admin/meta/settings...");
  const settingsRes = await fetch("http://localhost:3001/api/admin/meta/settings", {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("Centralized Settings Status:", settingsRes.status);
  const settingsJson = await settingsRes.json();
  console.log("Centralized Sections Present:", Object.keys(settingsJson).filter(k => k !== "ok" && k !== "tenantId"));

  // 5. Verify /api/cron/meta-sync execution (Priority 5)
  console.log("\nChecking /api/cron/meta-sync execution...");
  const cronRes = await fetch("http://localhost:3001/api/cron/meta-sync", {
    headers: { Cookie: `nb_admin_token=${token}` },
  });
  console.log("Cron Status:", cronRes.status);
  const cronJson = await cronRes.json();
  console.log("Cron Execution Result:", JSON.stringify(cronJson, null, 2));

  console.log("\n================ VISUAL CAPTURE ================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      url: "http://localhost:3001",
    },
  ]);

  const page = await context.newPage();

  // Capture Centralized Settings Page Overview
  console.log("Capturing Centralized Meta Settings Page...");
  await page.goto("http://localhost:3001/admin/meta/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotSettings = path.join(artifactDir, "meta-settings-centralized-overview.png");
  await page.screenshot({ path: shotSettings, fullPage: false });
  console.log("Saved:", shotSettings);

  // Click on '7. Security & Encryption' section pill
  const secPill = page.locator("button:has-text('7. Security')");
  if (await secPill.count() > 0) {
    await secPill.click();
    await page.waitForTimeout(1000);
    const shotSecurity = path.join(artifactDir, "meta-settings-security-section.png");
    await page.screenshot({ path: shotSecurity, fullPage: false });
    console.log("Saved:", shotSecurity);
  }

  // Click on '8. Auto-Synchronization' section pill
  const syncPill = page.locator("button:has-text('8. Auto-Synchronization')");
  if (await syncPill.count() > 0) {
    await syncPill.click();
    await page.waitForTimeout(1000);
    const shotSync = path.join(artifactDir, "meta-settings-sync-section.png");
    await page.screenshot({ path: shotSync, fullPage: false });
    console.log("Saved:", shotSync);
  }

  // Re-capture Events Manager Integrations Tab to confirm Domain shows 'Verified' (green)
  console.log("Re-capturing Integrations tab to confirm Domain shows 'Verified'...");
  await page.goto("http://localhost:3001/admin/meta/events?tab=integrations", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const shotIntegrationsVerified = path.join(artifactDir, "meta-events-integrations-verified.png");
  await page.screenshot({ path: shotIntegrationsVerified, fullPage: false });
  console.log("Saved:", shotIntegrationsVerified);

  await browser.close();
  console.log("Verification & visual capture complete!");
}

run().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
