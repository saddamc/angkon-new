import { chromium } from 'playwright';
const base = 'http://localhost:3001';
const routes = { shop: '/products' };
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const [n, r] of Object.entries(routes)) {
  try {
    await p.goto(base + r, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));} window.scrollTo(0,0); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `local/${n}.png`, fullPage: true });
    console.log('ok', n);
  } catch (e) { console.log('fail', n, String(e).slice(0,100)); }
}
await b.close();
