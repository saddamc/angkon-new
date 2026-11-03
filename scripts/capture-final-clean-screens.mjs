import { chromium } from "playwright";
import fs from "fs";
import path from "path";

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
  const b = btoa(JSON.stringify(payload));
  const data = `${header}.${b}`;
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

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addCookies([
    {
      name: "nb_admin_token",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);

  const page = await context.newPage();

  // 1. Events Manager ?tab=settings (Clean Read-Only View)
  console.log("1. Events Manager ?tab=settings");
  await page.goto("http://localhost:3001/admin/meta/events?tab=settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "meta-events-settings-tab-unified.png"), fullPage: false });

  // 1b. Click "Show Technical Details" toggle in Events Manager
  try {
    const toggleBtn = page.locator('button:has-text("Show Technical Details")').first();
    if (await toggleBtn.isVisible({ timeout: 2000 })) {
      await toggleBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, "meta-events-settings-tab-expanded.png"), fullPage: false });
    }
  } catch (e) {
    console.log("Could not toggle technical details:", e.message);
  }

  // 2. Centralized Settings Hub (/admin/meta/settings)
  console.log("2. Centralized Settings Hub");
  await page.goto("http://localhost:3001/admin/meta/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // Click "Test Dataset Health" button in Section 2
  try {
    const testDatasetBtn = page.locator('button:has-text("Test Dataset Health")').first();
    if (await testDatasetBtn.isVisible({ timeout: 2000 })) {
      console.log("Clicking 'Test Dataset Health'...");
      await testDatasetBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    // ignore
  }

  // Click "Test Cryptographic Vault Integrity" in Section 7
  try {
    const testSecBtn = page.locator('button:has-text("Test Cryptographic Vault Integrity")').first();
    if (await testSecBtn.isVisible({ timeout: 2000 })) {
      console.log("Clicking 'Test Cryptographic Vault Integrity'...");
      await testSecBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    // ignore
  }

  await page.screenshot({ path: path.join(artifactDir, "meta-settings-tested-live.png"), fullPage: false });
  await page.screenshot({ path: path.join(artifactDir, "meta-settings-all-overview.png"), fullPage: false });

  // 3. Ads & Attribution
  console.log("3. Ads & Attribution");
  await page.goto("http://localhost:3001/admin/meta/ads", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "meta-ads-streamlined-card.png"), fullPage: false });

  // 4. Catalog Feed
  console.log("4. Catalog Feed");
  await page.goto("http://localhost:3001/admin/meta/catalog", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "meta-catalog-forwarder-banner.png"), fullPage: false });

  // 5. Domain Verification
  console.log("5. Domain Verification");
  await page.goto("http://localhost:3001/admin/meta/domain-verification", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "meta-domain-forwarder-banner.png"), fullPage: false });

  await browser.close();
  console.log("ALL CLEAN SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
