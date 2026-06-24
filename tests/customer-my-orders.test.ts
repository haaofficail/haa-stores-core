// Customer "my orders" lookup by phone.
//
// Covers:
//   - service method `listForCustomerPhonePublic` filters by storeId + phone
//   - endpoint exists + requires phone + caps to 50
//   - response shape is the public-safe projection (no wallet/audit fields)
//   - unknown phone returns empty list, never 404 (no enumeration leak)
//   - storefront page + router + header link wiring

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('Customer My Orders — service', () => {
  const src = read('packages/commerce-core/src/orders.ts');

  it('listForCustomerPhonePublic exists with storeId + phone + limit args', () => {
    expect(src).toMatch(/listForCustomerPhonePublic\s*\(\s*\n?\s*storeId:\s*number,\s*\n?\s*phone:\s*string,\s*\n?\s*limit/);
  });

  it('caps the limit at 100 + min 1', () => {
    // Math.min(Math.max(1, limit), 100) — defensive default.
    expect(src).toMatch(/Math\.min\(Math\.max\(1,\s*limit\),\s*100\)/);
  });

  it('returns empty array on empty/whitespace phone (no enumeration)', () => {
    // The guard short-circuits before any DB query.
    expect(src).toMatch(/if\s*\(!normalized\)\s*return\s*\[\]/);
  });

  it('filters by both storeId AND customerPhone', () => {
    // Tenant isolation — never leak orders from another store.
    expect(src).toMatch(/eq\(s\.orders\.storeId,\s*storeId\)/);
    expect(src).toMatch(/eq\(s\.orders\.customerPhone,\s*normalized\)/);
  });

  it('orders newest-first', () => {
    expect(src).toMatch(/createdAt.*DESC/);
  });
});

describe('Customer My Orders — endpoint', () => {
  const src = read('apps/api/src/routes/storefront/my-orders.ts');

  it('GET /:slug/orders is registered', () => {
    expect(src).toMatch(/myOrdersRouter\.get\(['"]\/:slug\/orders['"]/);
  });

  it('requires `phone` query param with BAD_REQUEST on missing', () => {
    expect(src).toMatch(/c\.req\.query\(['"]phone['"]\)/);
    expect(src).toMatch(/BAD_REQUEST/);
  });

  it('routes via OrdersService (no direct drizzle import)', () => {
    expect(src).toMatch(/from\s+['"]@haa\/commerce-core['"]/);
    expect(src).toMatch(/OrdersService/);
    expect(src).not.toMatch(/from\s+['"]drizzle-orm['"]/);
  });

  it('caps service call at 50', () => {
    expect(src).toMatch(/listForCustomerPhonePublic\(store\.id,\s*phone,\s*50\)/);
  });

  it('public projection excludes wallet/audit/PII fields', () => {
    // Whitelist projection — assert only the .map block, not comments.
    // A future refactor that spreads `...o` would defeat this guard.
    expect(src).toMatch(/publicOrders/);
    const mapBlockStart = src.indexOf('orders.map((o)');
    const mapBlockEnd = src.indexOf('return c.json');
    expect(mapBlockStart).toBeGreaterThan(0);
    const projection = src.slice(mapBlockStart, mapBlockEnd);
    // The customer's own phone/email MUST NOT be echoed back in the
    // list response (they already know it; sending it back is leak
    // surface for a future SSRF or proxy bug).
    expect(projection).not.toMatch(/\bcustomerEmail\b/);
    expect(projection).not.toMatch(/\bcustomerPhone\b/);
    // No wallet ledger or audit-log fields in the projection.
    expect(projection).not.toMatch(/\bwalletEntry\b/);
    expect(projection).not.toMatch(/\bauditLog\b/);
  });

  it('is mounted under storefrontRouter', () => {
    const indexSrc = read('apps/api/src/routes/storefront/index.ts');
    expect(indexSrc).toMatch(/myOrdersRouter/);
  });
});

describe('Customer My Orders — storefront wiring', () => {
  it('orderApi.listByPhone hits /s/:slug/orders', () => {
    const api = read('apps/storefront/src/lib/api.ts');
    expect(api).toMatch(/listByPhone:\s*\(slug:\s*string,\s*phone:\s*string\)/);
    expect(api).toMatch(/\/s\/\$\{slug\}\/orders\?phone=/);
  });

  it('MyOrders page exists + uses listByPhone', () => {
    const page = read('apps/storefront/src/pages/MyOrders.tsx');
    expect(page).toMatch(/orderApi\.listByPhone/);
    expect(page).toMatch(/data-testid=['"]my-orders-list['"]/);
  });

  it('router declares /s/:slug/my-orders route', () => {
    const app = read('apps/storefront/src/App.tsx');
    expect(app).toMatch(/path=['"]my-orders['"]/);
    expect(app).toMatch(/import\(['"]@\/pages\/MyOrders['"]\)/);
  });

  it('header link points to my-orders (not /track) for the account icon', () => {
    const header = read('apps/storefront/src/components/Header.tsx');
    expect(header).toMatch(/\/s\/\$\{slug\}\/my-orders/);
  });

  it('drilling into an order pre-seeds the track-result phone cache', () => {
    // UX: clicking an order from the list should NOT re-prompt for phone
    // on the detail page. The list view writes the phone into the same
    // sessionStorage key the TrackOrder flow reads from.
    const page = read('apps/storefront/src/pages/MyOrders.tsx');
    expect(page).toMatch(/sessionStorage\.setItem\(`track_phone_\$\{slug\}_\$\{order\.orderNumber\}`/);
  });
});

describe('Customer My Orders — RBAC exemption', () => {
  it('rbac-coverage deny-list includes my-orders.ts', () => {
    const src = read('tests/rbac-coverage.test.ts');
    expect(src).toMatch(/my-orders\.ts/);
  });
});
