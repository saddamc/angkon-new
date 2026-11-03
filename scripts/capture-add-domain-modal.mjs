import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";
const ARTIFACT_DIR = path.resolve("C:/Users/Saddam/.gemini/antigravity/brain/2f2026a3-862e-43f4-b897-3e7a83158b5f");

async function createSuperadminToken() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["primary_store", "angkon-main"],
    defaultTenant: "primary_store",
    tenantId: "angkon-main",
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });

  const token = await createSuperadminToken();
  await context.addCookies([
    { name: "nb_admin_token", value: token, domain: "localhost", path: "/" },
    { name: "admin_token", value: token, domain: "localhost", path: "/" },
    { name: "tenant_id", value: "angkon-main", domain: "localhost", path: "/" },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3001/admin/meta/settings?section=domain", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);

  const btn = page.locator("button:has-text('+ Add Domain')").first();
  await btn.click();
  await page.waitForTimeout(1000);

  const modalPath = path.join(ARTIFACT_DIR, "meta-settings-add-domain-modal.png");
  await page.screenshot({ path: modalPath, fullPage: false });
  console.log("Saved Add Domain Modal:", modalPath, fs.statSync(modalPath).size, "bytes");

  await browser.close();
}

main().catch(console.error);
