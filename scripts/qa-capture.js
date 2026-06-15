const { chromium } = require('/Users/thwany/Desktop/haa-stores-core/node_modules/.pnpm/playwright@1.60.0/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const OUT = '/tmp/qa-review/final';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0, 200)));
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, '01-hero.png') });
  await page.screenshot({ path: path.join(OUT, '02-fullpage.png'), fullPage: true });
  for (const id of ['features', 'how', 'themes', 'pricing']) {
    try {
      await page.locator('#' + id).scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `0${3 + ['features', 'how', 'themes', 'pricing'].indexOf(id)}-${id}.png`) });
    } catch {}
  }
  // Demo modal
  try {
    await page.locator('button:has-text("العرض التوضيحي")').first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, '07-modal.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch (e) { console.log('modal:', e.message.slice(0, 100)); }
  // Mobile
  const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-SA', deviceScaleFactor: 2 });
  const pm = await ctxM.newPage();
  await pm.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await pm.waitForTimeout(2500);
  await pm.screenshot({ path: path.join(OUT, '08-mobile.png') });
  await browser.close();
  console.log('done');
})();
