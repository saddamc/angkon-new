import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Visual verification for the settings modal-editing pass.
 *
 * Mints a local superadmin session the same way the other capture-*.mjs
 * scripts do, then screenshots each edit flow to confirm the modal opens and
 * shows the stored ("old") value before the operator overwrites it.
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "settings-modals");
fs.mkdirSync(OUT, { recursive: true });

const envContent = fs.readFileSync(".env", "utf-8");
const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";

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

const shots = [];

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
  console.log(`  saved ${file}`);
}

/** Click the Edit/Add action on the row whose label starts with `label`. */
async function openRowModal(page, label) {
  // Row: <div class="... sm:flex-row"> wrapping <div><p>label:</p></div> … <button>.
  const row = page
    .locator(`div[class*="sm:flex-row"]:has(p:text-is("${label}:"))`)
    .first();
  await row.waitFor({ timeout: 15000 });
  const button = row.locator("button", { hasText: /Edit|Add|Replace|Configure/ }).first();
  await button.click({ timeout: 15000 });
  await page.waitForSelector("[role=dialog]", { timeout: 8000 });
  await page.waitForTimeout(400);
}

async function run() {
  const token = await createSuperadminToken();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([
    { name: "nb_admin_token", value: token, domain: "localhost", path: "/" },
  ]);

  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (err) => failures.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") failures.push(`console: ${msg.text()}`);
  });

  console.log("Navigating to settings...");
  await page.goto("http://localhost:3001/admin/meta/settings", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector("text=General & Business Portfolio", { timeout: 30000 });
  await page.waitForTimeout(2500);

  await shoot(page, "01-settings-read-only");

  // 1. Business Portfolio ID — modal must show the stored value first.
  console.log("Opening Business Portfolio modal...");
  await openRowModal(page, "Business Portfolio ID");
  const businessCurrent = await page
    .locator("[role=dialog]")
    .innerText()
    .catch(() => "");
  console.log("  dialog text:\n" + businessCurrent.split("\n").slice(0, 8).join(" | "));
  await shoot(page, "02-business-portfolio-modal");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 2. Meta App Secret — masked current value + Remove affordance.
  console.log("Opening Meta App Secret modal...");
  await openRowModal(page, "Meta App Secret");
  const secretText = await page
    .locator("[role=dialog]")
    .innerText()
    .catch(() => "");
  console.log("  dialog text:\n" + secretText.split("\n").slice(0, 10).join(" | "));
  await shoot(page, "03-app-secret-modal");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 3. Dataset section — Pixel ID modal (previously an inline form).
  console.log("Opening Dataset / Pixel ID modal...");
  await openRowModal(page, "Dataset / Pixel ID");
  await shoot(page, "04-dataset-id-modal");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 4. Tracking signals — previously read-only, now its own modal.
  console.log("Opening Tracking signals modal...");
  await openRowModal(page, "Tracking signals");
  const signalsText = await page
    .locator("[role=dialog]")
    .innerText()
    .catch(() => "");
  console.log("  dialog text:\n" + signalsText.split("\n").slice(0, 8).join(" | "));
  await shoot(page, "05-tracking-signals-modal");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // 5. Confirm only one dialog can exist at a time (deduped modal registry).
  const dialogCount = await page.locator("[role=dialog]").count();
  console.log(`dialogs open after Escape: ${dialogCount}`);

  await browser.close();

  console.log("\n=== RESULT ===");
  console.log(JSON.stringify({ shots, failures, dialogCount }, null, 2));
}

run().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
