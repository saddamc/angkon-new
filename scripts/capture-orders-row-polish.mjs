import { chromium } from "playwright";
import fs from "fs";
import path from "path";

/**
 * Renders the orders list with deliberately long values (mocked API) to check
 * that every text cell truncates cleanly instead of breaking the grid.
 */

const OUT = process.env.OUT_DIR || path.join(process.env.TEMP || ".", "orders-row");
fs.mkdirSync(OUT, { recursive: true });

const env = fs.readFileSync(".env", "utf-8");
const secret = (env.match(/JWT_SECRET=([^\r\n]+)/) || [])[1]?.trim() || "angkon_secure_jwt_secret_2026";

async function token() {
  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "S",
    role: "superadmin",
    authorizedTenants: ["angkon-main", "primary_store"],
    defaultTenant: "primary_store",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const b = Buffer.from(JSON.stringify(payload)).toString("base64");
  const d = `${h}.${b}`;
  const crypto = await import("crypto");
  return `${d}.${crypto.createHmac("sha256", secret).update(d).digest("base64")}`;
}

const long = {
  id: 9101,
  number: "ANG-890952-275",
  status: "pending",
  paymentStatus: "pending",
  payment_status: "pending",
  date_created: "2026-11-03T10:00:00Z",
  total: "8110",
  payment_method_title: "Cash on Delivery",
  billing: {
    first_name: "Nowshin Tabassum Rahman Chowdhury",
    last_name: "",
    email: "nowshin.tabassum.rahman.37@gmail.com",
    phone: "+8801329962414",
    address_1: "Mymensingh, Shankipara, Cantonment College Road, House 12, Block C",
    city: "Mymensingh",
  },
  line_items: [
    {
      name: "Tawakkal Wada – Deep Raspberry Magenta Premium Embroidered Suit",
      quantity: 1,
      size: "M",
      price: "8110",
    },
  ],
};

const paid = {
  ...long,
  id: 9102,
  number: "ANG-890952-276",
  status: "completed",
  paymentStatus: "paid",
  payment_status: "paid",
  total: "12450",
  billing: { ...long.billing, first_name: "Ridi Mondal", email: "ridi.mondal@example.com" },
  line_items: [{ name: "Gulnaar Dastaan – Blush Pink", quantity: 2, size: "L", price: "6225" }],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 700 } });
await ctx.addCookies([{ name: "nb_admin_token", value: await token(), domain: "localhost", path: "/" }]);
const page = await ctx.newPage();

await page.route("**/api/admin/orders?*", async (route) => {
  if (route.request().method() !== "GET") return route.continue();
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ orders: [long, paid], total: 2, totalPages: 1 }),
  });
});

await page.goto("http://localhost:3001/admin/orders", { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("text=ORDER NO & DATE", { timeout: 60000 });
await page.waitForTimeout(1500);

const file = path.join(OUT, "01-row-long-text.png");
await page.screenshot({ path: file });

// A truncate rule clips on purpose; what must never happen is the page itself
// scrolling horizontally because a cell refused to shrink.
const layout = await page.evaluate(() => ({
  pageScrollWidth: document.documentElement.scrollWidth,
  pageClientWidth: document.documentElement.clientWidth,
  rowCount: document.querySelectorAll("div.group").length,
}));

console.log(
  JSON.stringify(
    {
      file,
      ...layout,
      horizontalOverflow: layout.pageScrollWidth > layout.pageClientWidth + 1,
    },
    null,
    2
  )
);
await browser.close();
