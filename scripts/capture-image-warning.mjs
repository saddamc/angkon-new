import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "img-warn");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1].trim();
async function token() {
  const p = { sub: "saddam13bd@gmail.com", name: "S", role: "superadmin", authorizedTenants: ["primary_store"], defaultTenant: "primary_store", exp: Math.floor(Date.now() / 1000) + 3600 };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(p)).toString("base64");
  const d = `${h}.${b}`;
  const crypto = await import("crypto");
  return `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VIEW_W || 1440), height: Number(process.env.VIEW_H || 900) } });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

const warnings = [];
page.on("console", (msg) => {
  const t = msg.text();
  if (/width or height modified/i.test(t)) warnings.push({ page: page.url(), text: t.slice(0, 220) });
});

const pages = [
  "/admin/categories",
  "/admin/products/228017/edit",
  "/",
];

for (const p of pages) {
  try {
    await page.goto(`http://localhost:3001${p}`, { waitUntil: "networkidle", timeout: 180000 });
    await page.waitForTimeout(2500);
    console.log(`visited ${p} -> ok`);
  } catch (e) {
    console.log(`visited ${p} -> ${e.message.slice(0, 60)}`);
  }
}

// Inspect every banner image on the last page + admin categories
const report = [];
for (const p of ["/admin/categories"]) {
  await page.goto(`http://localhost:3001${p}`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2000);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => img.currentSrc.includes("/banners/"))
      .map((img) => ({
        currentSrc: img.currentSrc.replace(location.origin, ""),
        attrW: img.getAttribute("width"),
        attrH: img.getAttribute("height"),
        clientW: img.clientWidth,
        clientH: img.clientHeight,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        cls: (img.className || "").replace(/\s+/g, " ").slice(0, 80),
      }))
  );
  report.push(...rows);
}

console.log("\n=== warnings ===");
for (const w of warnings) console.log(`  [${w.page}] ${w.text}`);

console.log("\n=== banner <img> on /admin/categories ===");
for (const r of report) console.log("  " + JSON.stringify(r));

await browser.close();
