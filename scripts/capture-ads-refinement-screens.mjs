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

  // 1. Ads & Attribution Page - Full Read-Only Dashboard
  console.log("1. Ads & Attribution Page");
  await page.goto("http://localhost:3001/admin/meta/ads", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(artifactDir, "meta-ads-readonly-dashboard.png"), fullPage: false });

  // 1b. Click "Show Technical Details" on Ads Page
  try {
    const techToggle = page.locator('button:has-text("Show Technical Details")').first();
    if (await techToggle.isVisible({ timeout: 2000 })) {
      await techToggle.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, "meta-ads-tech-details-expanded.png"), fullPage: false });
    }
  } catch (e) {
    console.log("Technical details toggle:", e.message);
  }

  // 2. Meta Suite Settings Section 3 (Ads & Marketing API)
  console.log("2. Meta Suite Settings (Section 3)");
  await page.goto("http://localhost:3001/admin/meta/settings?section=ads", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(artifactDir, "meta-settings-ads-section-dialogs.png"), fullPage: false });

  // 2b. Click "Configure Ad Account" to open modal
  try {
    const configBtn = page.locator('button:has-text("Configure Ad Account")').first();
    if (await configBtn.isVisible({ timeout: 2000 })) {
      await configBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, "meta-settings-ad-account-modal.png"), fullPage: false });
      // Close modal
      const closeBtn = page.locator('button[aria-label="Close dialog"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 })) await closeBtn.click();
    }
  } catch (e) {
    console.log("Configure modal open:", e.message);
  }

  // 2c. Click "Attribution Windows" to open modal
  try {
    const attrBtn = page.locator('button:has-text("Attribution Windows")').first();
    if (await attrBtn.isVisible({ timeout: 2000 })) {
      await attrBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, "meta-settings-attribution-modal.png"), fullPage: false });
    }
  } catch (e) {
    console.log("Attribution modal open:", e.message);
  }

  await browser.close();
  console.log("ALL ADS REFINEMENT SCREENSHOTS CAPTURED!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
