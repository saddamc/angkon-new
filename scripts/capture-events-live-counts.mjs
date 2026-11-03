import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "events-live");
fs.mkdirSync(OUT, { recursive: true });

const envContent = fs.readFileSync(".env", "utf-8");
const secret = (envContent.match(/JWT_SECRET=([^\r\n]+)/) || [])[1]?.trim() || "angkon_secure_jwt_secret_2026";

async function token() {
  const payload = {
    sub: "saddam13bd@gmail.com", name: "Saddam Superadmin", role: "superadmin",
    authorizedTenants: ["angkon-main", "primary_store"], defaultTenant: "angkon-main",
    exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
  };
  const h = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const d = `${h}.${btoa(JSON.stringify(payload))}`;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(d));
  return `${d}.${btoa(String.fromCharCode(...new Uint8Array(s)))}`;
}

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1100 } });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

await page.goto("http://localhost:3001/admin/meta/events", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector("text=Total Events", { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(8000);

const shot = path.join(OUT, "01-events-live-counts.png");
await page.screenshot({ path: shot, fullPage: false });

// Extract the Local:/Meta: pairs so we can assert no fabricated numbers remain.
const pairs = await page.evaluate(() => {
  const out = [];
  const cells = [...document.querySelectorAll("td")];
  for (const td of cells) {
    const text = td.innerText || "";
    if (text.includes("Local:") && text.includes("Meta:")) {
      out.push(text.replace(/\s+/g, " ").trim());
    }
  }
  return out.slice(0, 8);
});

const body = await page.evaluate(() => document.body.innerText);
const hasFabricated = ["~1,600", "321", "77", "52", "57", "0 (Isolated)"].filter((n) => body.includes(n));

console.log(JSON.stringify({ shot, pairs, hasFabricated, errors }, null, 2));
await b.close();
