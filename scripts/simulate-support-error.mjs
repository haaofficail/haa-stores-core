#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EVENTS_FILE = join(ROOT, 'storage', 'support-error-events.ndjson');

const dir = dirname(EVENTS_FILE);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const errorCodes = [
  'API-001', 'SYS-001', 'STORE-001', 'DASH-001', 'THEME-001',
  'THEME-002', 'PAY-001', 'SHIP-001', 'ORDER-001', 'RBAC-001',
  'WEBHOOK-001', 'JOB-001', 'VALIDATION-001', 'NETWORK-001',
];

const severities = ['P0', 'P1', 'P2', 'P3', 'P4'];
const origins = ['api', 'dashboard', 'storefront', 'worker', 'webhook'];
const sources = [
  'platform_bug', 'merchant_config', 'external_provider',
  'permission_denied', 'validation_error', 'theme_runtime',
  'network_error', 'database_error',
];
const areas = ['api', 'system', 'store', 'dashboard', 'theme', 'pay', 'ship', 'order', 'rbac', 'webhook', 'job'];
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const apps = ['api', 'merchant-dashboard', 'storefront', 'worker', 'webhook-handler'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const errorCode = pick(errorCodes);
const severity = pick(severities);
const origin = pick(origins);
const app = pick(apps);
const area = pick(areas);
const source = pick(sources);
const method = pick(methods);
const route = `/${pick(['api', 'dashboard', 'storefront', 'checkout', 'admin', 'settings'])}/${pick(['orders', 'products', 'themes', 'shipping', 'payments', 'users', 'webhooks', 'jobs'])}`;

const event = {
  eventId: 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
  timestamp: new Date().toISOString(),
  errorCode,
  severity,
  source,
  area,
  message: `Simulated ${errorCode} error from ${origin} on route ${route}`,
  safeMessage: 'هذا خطأ تجريبي محاكى.',
  correlationId: 'req-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  fingerprint: `${errorCode}::${area}::${route}::simulated_${errorCode}_error`,
  route,
  method,
  statusCode: parseInt(errorCode === 'VALIDATION-001' ? '400' : errorCode === 'NETWORK-001' ? '503' : '500'),
  app,
  environment: 'development',
  origin,
  handled: true,
  merchantId: 1,
  storeId: 1,
  tags: ['simulated', 'test', errorCode],
};

appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');

console.log('Wrote simulated event:');
console.log('  eventId:      ' + event.eventId);
console.log('  correlationId:' + event.correlationId);
console.log('  errorCode:    ' + event.errorCode);
console.log('  severity:     ' + event.severity);
console.log('  origin:       ' + event.origin);
console.log('  route:        ' + event.route);
console.log('  file:         ' + EVENTS_FILE);
