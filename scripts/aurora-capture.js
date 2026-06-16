const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = '/tmp/qa-review/aurora';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'final-01-hero.png') });
  await page.screenshot({ path: path.join(OUT, 'final-02-full.png'), fullPage: true });
  await page.evaluate(() => document.querySelector('#pricing')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'final-03-pricing.png') });
  // Click yearly
  try {
    await page.locator('button[aria-pressed="false"]:has-text("سنويًا")').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'final-04-pricing-yearly.png') });
  } catch {}
  // Mobile
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA', deviceScaleFactor: 2 });
  const pm = await ctxM.newPage();
  await pm.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await pm.waitForTimeout(2500);
  await pm.screenshot({ path: path.join(OUT, 'final-05-mobile.png') });
  await browser.close();
  console.log('done');
})();
