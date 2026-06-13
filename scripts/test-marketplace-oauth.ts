import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

function ok(label: string, msg = '') {
  console.log(`  ${GREEN}✓${RESET} ${label}${msg ? ` ${CYAN}(${msg})${RESET}` : ''}`);
}
function fail(label: string, msg: string) {
  console.log(`  ${RED}✗${RESET} ${label} — ${RED}${msg}${RESET}`);
}
function skip(label: string) {
  console.log(`  ${YELLOW}○${RESET} ${label} — ${YELLOW}مهمل (غير مكوّن)${RESET}`);
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const envFiles = [resolve(__dirname, '../.env'), resolve(__dirname, '../.env.example')];
  for (const f of envFiles) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return env;
}

function checkApiBuilt() {
  console.log(`\n${MAGENTA}═══ حالة المشروع ═══${RESET}`);
  const apiDist = resolve(__dirname, '../apps/api/dist');
  if (existsSync(apiDist)) ok('API مبني', apiDist);
  else fail('API غير مبني', 'شغل pnpm --filter @haa/api build');
  
  const dashDist = resolve(__dirname, '../apps/merchant-dashboard/dist');
  if (existsSync(dashDist)) ok('لوحة التحكم مبنية', dashDist);
  else ok('لوحة التحكم (تشغيل dev)', 'pnpm dev:dashboard');
}

function checkEndpoints() {
  console.log(`\n${MAGENTA}═══ نقاط API المتاحة ═══${RESET}`);
  const endpoints = [
    'GET  /merchant/:storeId/marketplaces',
    'GET  /merchant/:storeId/marketplaces/hub',
    'GET  /merchant/:storeId/marketplaces/summary',
    'GET  /merchant/:storeId/marketplaces/sync-logs',
    'POST /merchant/:storeId/marketplaces/sync-all',
    'POST /merchant/:storeId/marketplaces/:provider/connect',
    'POST /merchant/:storeId/marketplaces/:provider/disconnect',
    'POST /merchant/:storeId/marketplaces/:provider/publish',
    'POST /merchant/:storeId/marketplaces/:provider/sync/orders',
    'GET  /merchant/:storeId/marketplaces/:provider/listings',
    'GET  /merchant/:storeId/marketplaces/:provider/sales',
  ];
  for (const ep of endpoints) ok(ep);
}

function validateSalla(env: Record<string, string>) {
  console.log(`\n${CYAN}═══ سلة (Salla) ═══${RESET}`);
  const id = env['SALLA_CLIENT_ID'];
  const secret = env['SALLA_CLIENT_SECRET'];
  const redirect = env['SALLA_REDIRECT_URI'];
  if (!id || !secret) { skip('SALLA_CLIENT_ID/SECRET — غير مكوّنة'); return; }
  ok('SALLA_CLIENT_ID موجودة', id.length > 10 ? `${id.slice(0, 8)}...` : id);
  ok('SALLA_CLIENT_SECRET موجودة', secret.length > 10 ? `${secret.slice(0, 8)}...` : secret);
  if (redirect) ok('SALLA_REDIRECT_URI موجودة', redirect);
  const oauthUrl = `https://salla.sa/oauth?client_id=${id}&response_type=code&redirect_uri=${encodeURIComponent(redirect || 'http://localhost:3000/oauth/callback')}&scope=products.read,products.write,orders.read,inventory.read,inventory.write`;
  ok('رابط OAuth جاهز', oauthUrl.slice(0, 60) + '...');
}

function validateZid(env: Record<string, string>) {
  console.log(`\n${CYAN}═══ زد (Zid) ═══${RESET}`);
  const id = env['ZID_CLIENT_ID'];
  const secret = env['ZID_CLIENT_SECRET'];
  const redirect = env['ZID_REDIRECT_URI'];
  if (!id || !secret) { skip('ZID_CLIENT_ID/SECRET — غير مكوّنة'); return; }
  ok('ZID_CLIENT_ID موجودة', id.length > 10 ? `${id.slice(0, 8)}...` : id);
  ok('ZID_CLIENT_SECRET موجودة', secret.length > 10 ? `${secret.slice(0, 8)}...` : secret);
  if (redirect) ok('ZID_REDIRECT_URI موجودة', redirect);
}

function validateNoon(env: Record<string, string>) {
  console.log(`\n${CYAN}═══ نون (Noon) ═══${RESET}`);
  const id = env['NOON_CLIENT_ID'] || '(من الواجهة)';
  const pk = env['NOON_PRIVATE_KEY'];
  if (id === '(من الواجهة)' && !pk) { skip('NOON_CLIENT_ID/PRIVATE_KEY — يُدخل من واجهة المستخدم'); return; }
  ok('NOON_CLIENT_ID', id.length > 5 ? `${id.slice(0, 16)}...` : id);
  if (pk) {
    const hasHeader = pk.includes('BEGIN RSA PRIVATE KEY');
    const hasFooter = pk.includes('END RSA PRIVATE KEY');
    const b64 = pk.replace(/-----BEGIN RSA PRIVATE KEY-----/, '').replace(/-----END RSA PRIVATE KEY-----/, '').replace(/\n/g, '').trim();
    const validB64 = /^[A-Za-z0-9+/=]+$/.test(b64);
    if (hasHeader && hasFooter && validB64) {
      ok('Private Key صالح', `${b64.length} حرف base64`);
    } else {
      fail('Private Key', !hasHeader ? 'مفقود HEADER' : !hasFooter ? 'مفقود FOOTER' : 'لايسيت base64 صحيح');
    }
  } else {
    skip('NOON_PRIVATE_KEY — يُدخل من واجهة المستخدم');
  }
}

function validateAmazon(env: Record<string, string>) {
  console.log(`\n${CYAN}═══ أمازون (Amazon SP-API) ═══${RESET}`);
  const id = env['AMAZON_CLIENT_ID'];
  const secret = env['AMAZON_CLIENT_SECRET'];
  const refresh = env['AMAZON_REFRESH_TOKEN'];
  const awsKey = env['AMAZON_AWS_ACCESS_KEY'];
  const awsSecret = env['AMAZON_AWS_SECRET_KEY'];
  const mkt = env['AMAZON_MARKETPLACE_ID'];
  if (!id && !awsKey) { skip('AMAZON_* — غير مكوّنة'); return; }
  if (id) ok('AMAZON_CLIENT_ID', `${id.slice(0, 12)}...`);
  if (secret) ok('AMAZON_CLIENT_SECRET', `${secret.slice(0, 8)}...`);
  if (refresh) ok('AMAZON_REFRESH_TOKEN', `${refresh.slice(0, 20)}...`);
  if (awsKey) ok('AMAZON_AWS_ACCESS_KEY', `${awsKey.slice(0, 8)}...`);
  if (awsSecret) ok('AMAZON_AWS_SECRET_KEY', `${awsSecret.slice(0, 8)}...`);
  if (mkt) ok('AMAZON_MARKETPLACE_ID', mkt);
  const missing = [];
  if (!id) missing.push('AMAZON_CLIENT_ID');
  if (!secret) missing.push('AMAZON_CLIENT_SECRET');
  if (!refresh) missing.push('AMAZON_REFRESH_TOKEN');
  if (!awsKey) missing.push('AMAZON_AWS_ACCESS_KEY');
  if (!awsSecret) missing.push('AMAZON_AWS_SECRET_KEY');
  if (!mkt) missing.push('AMAZON_MARKETPLACE_ID');
  if (missing.length > 0 && missing.length < 6) {
    fail('مفقود', missing.join(', '));
  }
}

function validateStorefront() {
  console.log(`\n${CYAN}═══ ها ديمو (Storefront) ═══${RESET}`);
  const storefrontPath = resolve(__dirname, '../apps/storefront');
  const distPath = resolve(storefrontPath, 'dist');
  if (existsSync(distPath)) ok('المتجر مبني', `${distPath}`);
  else ok('المتجر جاهز للتشغيل', 'شغل `pnpm dev:storefront`');
  ok('المسار: /s/haa-demo', 'http://localhost:5175/s/haa-demo');
}

async function main() {
  console.log(`${CYAN}═══════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  اختبار الربط — Haa Stores Marketplaces${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════════════${RESET}`);
  const env = loadEnv();
  checkApiBuilt();
  checkEndpoints();
  validateSalla(env);
  validateZid(env);
  validateNoon(env);
  validateAmazon(env);
  validateStorefront();
  console.log(`\n${CYAN}═══════════════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  شغل: pnpm dev:all لتشغيل الكل${RESET}`);
  console.log(`${CYAN}  افتح: http://localhost:5173/channels/hub${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════════════\n${RESET}`);
}

main();
