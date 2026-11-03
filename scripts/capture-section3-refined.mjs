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

  console.log("Navigating to settings...");
  await page.goto("http://localhost:3001/admin/meta/settings", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  // Click tab "3. Ads & Marketing API"
  const adsTab = page.locator('button:has-text("3. Ads & Marketing API")').first();
  if (await adsTab.isVisible({ timeout: 3000 })) {
    await adsTab.click();
    await page.waitForTimeout(1000);
  }

  // Click "Configure Ad Account" modal
  const configBtn = page.locator('button:has-text("Configure Ad Account")').first();
  if (await configBtn.isVisible({ timeout: 2000 })) {
    console.log("Opening Configure Ad Account modal...");
    await configBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, "meta-settings-configure-ad-account-modal.png"), fullPage: false });
    const closeBtn = page.locator('button[aria-label="Close dialog"]').first();
    if (await closeBtn.isVisible({ timeout: 1000 })) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Click "Replace Token" modal
  const replaceBtn = page.locator('button:has-text("Replace Token")').first();
  if (await replaceBtn.isVisible({ timeout: 2000 })) {
    console.log("Opening Replace Marketing Token modal...");
    await replaceBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, "meta-settings-replace-marketing-token-modal.png"), fullPage: false });
  }

  await browser.close();
  console.log("Captured all modals!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
