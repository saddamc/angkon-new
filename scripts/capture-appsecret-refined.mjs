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
    authorizedTenants: ["angkon-main", "primary_store"],
    defaultTenant: "angkon-main",
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
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to settings...");
  await page.goto("http://localhost:3001/admin/meta/settings", { waitUntil: "networkidle" });
  await page.waitForSelector("text=General & Business Portfolio", { timeout: 20000 });
  await page.waitForTimeout(3000);

  // Scroll section 1 into view
  await page.evaluate(() => {
    const el = document.getElementById("meta-canvas-scroll");
    if (el) el.scrollTop = 520;
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(artifactDir, "meta-settings-section-1-appsecret-refined.png"), fullPage: false });
  console.log("SAVED meta-settings-section-1-appsecret-refined.png");

  // Click Configure on Meta App Secret
  const configBtn = page.locator('button:has-text("Configure")').first();
  if (await configBtn.isVisible({ timeout: 3000 })) {
    await configBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, "meta-settings-appsecret-modal.png"), fullPage: false });
    console.log("SAVED meta-settings-appsecret-modal.png");
  }

  await browser.close();
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
