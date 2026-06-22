// RBAC chain ordering — Wave 15.
//
// Asserts that every tenant-scoped router applies its guards in the
// correct order. The chain MUST be:
//
//     router.use('*', requireAuth(), requireStoreAccess())
//
// Permission guards (`requirePermission(...)`) attached per route may
// follow on the handler; `requireStoreAccess()` MUST precede them so the
// tenant-boundary check happens before any permission decision.
//
// If a future change drops `requireStoreAccess` from a tenant-scoped
// route file, or applies `requirePermission` at the router level without
// `requireStoreAccess` first, this test fails.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROUTES_DIR = resolve(__dirname, '../apps/api/src/routes');

// Public-by-design or self-guarded routes that legitimately do NOT use
// the requireAuth + requireStoreAccess pair. Source: tests/rbac-coverage.
// Keep in sync with that DENY_LIST.
const EXEMPT_FILES = new Set<string>([
  'auth.ts',
  'admin/auth.ts',
  'admin/index.ts',
  'admin/tenants-stores.ts',
  'admin/operations.ts',
  'admin/marketplace.ts',
  'admin/billing-settings.ts',
  'marketplaces/index.ts',
  'marketplaces/salla.ts',
  'marketplaces/zid.ts',
  'marketplaces/amazon.ts',
  'webhooks.ts',
  'shipping-webhooks.ts',
  'landing-ai-agent.ts',
  'public-api.ts',
  'health.ts',
  'support-errors.ts',
  'sitemap.ts',
  'haa-marketplace.ts',
  'storefront/_shared.ts',
  'storefront/cart-recovery.ts',
  'storefront/cart.ts',
  'storefront/checkout.ts',
  'storefront/index.ts',
  'storefront/pixels.ts',
  'storefront/products.ts',
  'storefront/store-info.ts',
  'storefront/support.ts',
]);

function walk(dir: string, prefix = '', acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, rel, acc);
    } else if (entry.endsWith('.ts')) {
      acc.push(rel);
    }
  }
  return acc;
}

describe('RBAC chain ordering (Wave 15)', () => {
  const offenders: Array<{ file: string; reason: string }> = [];
  const checkedFiles: string[] = [];

  for (const rel of walk(ROUTES_DIR).sort()) {
    if (EXEMPT_FILES.has(rel)) continue;
    const text = readFileSync(join(ROUTES_DIR, rel), 'utf-8');
    if (!/router\.use\(/.test(text) && !/\.use\(/.test(text)) continue;

    const usesStoreAccess = /requireStoreAccess\s*\(/.test(text);
    const usesPermission = /requirePermission\s*\(/.test(text);

    if (!usesStoreAccess && (usesPermission || /storeId/.test(text))) {
      offenders.push({ file: rel, reason: 'mentions storeId or requirePermission but does not call requireStoreAccess' });
      continue;
    }

    if (!usesStoreAccess) continue;

    // Confirm that requireStoreAccess appears BEFORE the first requirePermission.
    if (usesPermission) {
      const sIdx = text.indexOf('requireStoreAccess(');
      const pIdx = text.indexOf('requirePermission(');
      if (sIdx < 0 || pIdx < 0) continue;
      if (sIdx > pIdx) {
        offenders.push({ file: rel, reason: 'requirePermission appears before requireStoreAccess' });
        continue;
      }
    }

    checkedFiles.push(rel);
  }

  it(`every non-exempt tenant route applies requireStoreAccess before requirePermission (checked ${'${checkedFiles.length}'} files)`, () => {
    if (offenders.length > 0) {
      const msg = offenders.map((o) => `  - ${o.file}: ${o.reason}`).join('\n');
      throw new Error(`RBAC chain-ordering violations:\n${msg}`);
    }
    expect(offenders).toEqual([]);
  });
});
