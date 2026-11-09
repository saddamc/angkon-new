import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "subcat-modal");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1].trim();
const p = { sub: "saddam13bd@gmail.com", name: "S", role: "superadmin", authorizedTenants: ["primary_store"], defaultTenant: "primary_store", exp: Math.floor(Date.now() / 1000) + 3600 };
const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
const b = Buffer.from(JSON.stringify(p)).toString("base64");
const d = `${h}.${b}`;
const crypto = await import("crypto");
const token = `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "nb_admin_token", value: token, domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.goto("http://localhost:3001/admin/categories", { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(2500);

// "Add Subcategory" lives in a row's kebab menu.
await page.locator('button[title="More actions"]').first().click();
await page.waitForTimeout(400);
const addSub = page.locator("button", { hasText: "Add Subcategory" }).first();
await addSub.click({ timeout: 15000 });
await page.waitForSelector('[role="dialog"]', { timeout: 20000 });
await page.waitForTimeout(800);

const presetStyles = await page.evaluate(() => {
  const dlg = document.querySelector('[role="dialog"]');
  if (!dlg) return [];
  return [...dlg.querySelectorAll("button")]
    .filter((b) => /^(Polo|Tees|Half Sleeves|Full Sleeves|Pants|Tops)$/.test((b.textContent || "").trim()))
    .map((b) => {
      const s = getComputedStyle(b);
      return {
        label: (b.textContent || "").trim(),
        bg: s.backgroundColor,
        color: s.color,
        border: s.borderColor,
        pressed: b.getAttribute("aria-pressed"),
      };
    });
});

const file = path.join(OUT, "subcategory.png");
await page.screenshot({ path: file });

console.log("preset chips:", JSON.stringify(presetStyles, null, 2));
console.log("screenshot:", file);

await page.keyboard.press("Escape");
await browser.close();
