/**
 * useSmartAlerts — modular per-domain rule split (P1 audit Part 2).
 *
 * Original bug: useSmartAlerts.ts was a 1096-LOC monolith with 30+
 * inline rule blocks, making per-domain edits dangerous and rule
 * additions costly.
 *
 * Fix: each domain (payment / shipping / inventory / compliance /
 * marketing) lives in its own pure-function module under
 * `./smart-alerts/`. The top-level hook stays under 200 LOC and only
 * composes + sorts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const HOOKS_DIR = resolve(
  __dirname,
  '..',
  'apps/merchant-dashboard/src/pages/dashboard/hooks',
);
const TOP = resolve(HOOKS_DIR, 'useSmartAlerts.ts');
const MODULE_DIR = resolve(HOOKS_DIR, 'smart-alerts');

const DOMAINS = [
  'payment-rules',
  'shipping-rules',
  'inventory-rules',
  'compliance-rules',
  'marketing-rules',
];

function loc(path: string): number {
  return readFileSync(path, 'utf-8').split('\n').length;
}

describe('useSmartAlerts modular split (P1 audit Part 2)', () => {
  it('top-level useSmartAlerts.ts is under 200 LOC', () => {
    const lines = loc(TOP);
    expect(lines).toBeLessThan(200);
  });

  it('every per-domain rule module exists', () => {
    expect(existsSync(MODULE_DIR)).toBe(true);
    expect(statSync(MODULE_DIR).isDirectory()).toBe(true);
    for (const d of DOMAINS) {
      const p = resolve(MODULE_DIR, `${d}.ts`);
      expect(existsSync(p), `${d}.ts missing`).toBe(true);
    }
  });

  it('top-level hook imports every domain module by name', () => {
    const top = readFileSync(TOP, 'utf-8');
    for (const d of DOMAINS) {
      const importName =
        d.replace(/-./g, (m) => m[1].toUpperCase()); // payment-rules → paymentRules
      expect(top, `${importName} import missing`).toMatch(
        new RegExp(`import\\s*\\{[^}]*\\b${importName}\\b[^}]*\\}\\s*from\\s*['"]\\.\\/smart-alerts\\/${d}['"]`),
      );
    }
  });

  it('each domain module exports a single rule function returning SmartAlert[]', () => {
    for (const d of DOMAINS) {
      const src = readFileSync(resolve(MODULE_DIR, `${d}.ts`), 'utf-8');
      const fn = d.replace(/-./g, (m) => m[1].toUpperCase());
      expect(src, `${d} should export function ${fn}`).toMatch(
        new RegExp(`export\\s+function\\s+${fn}\\s*\\(`),
      );
      expect(src).toMatch(/SmartAlert\[\]/);
      // Pure-function contract — no React state.
      expect(src).not.toMatch(/useState|useEffect|useMemo|useRef/);
    }
  });

  it('top-level hook still produces SmartAlert[] sorted by priority', () => {
    const top = readFileSync(TOP, 'utf-8');
    expect(top).toMatch(/sort\(\(a,\s*b\)\s*=>\s*a\.priority\s*-\s*b\.priority\)/);
    // useMemo guarantees the composition is memoised — same as the
    // original implementation.
    expect(top).toMatch(/useMemo<SmartAlert\[\]>/);
  });

  it('behaviour parity guard — all 30+ original alert ids still emitted from some module', () => {
    const ids = [
      'welcome-start', 'low-stock', 'out-of-stock', 'no-shipping',
      'no-products', 'no-brands', 'no-categories', 'no-tags',
      'subscription-expiring', 'subscription-soon', 'subscription-trialing',
      'subscription-past-due', 'subscription-cancelled', 'pending-orders',
      'cod-collection', 'confirmed-orders', 'high-value-order',
      'repeat-customer', 'store-readiness', 'wallet-empty', 'wallet-low',
      'first-sale', 'milestone-10', 'milestone-100', 'cancellation-spike',
      'low-aov', 'top-selling', 'no-stock-missing', 'best-customer',
      'no-sales-7days', 'sales-surge', 'sales-drop', 'weekend-sales',
      'growth-streak', 'bulk-stock', 'top-category', 'abandoned-carts',
      'payment-not-configured', 'tax-not-configured', 'custom-domain',
      'ssl-expiring', 'domain-mismatch', 'high-returns', 'late-shipment',
      'coupon-expired', 'campaign-no-results', 'integrations-disconnected',
      'notification-failure', 'no-bank-account', 'compliance-incomplete',
      'low-conversion', 'customers-inactive', 'season-upcoming',
    ];
    const allModuleSrc = DOMAINS
      .map((d) => readFileSync(resolve(MODULE_DIR, `${d}.ts`), 'utf-8'))
      .join('\n');
    for (const id of ids) {
      expect(allModuleSrc, `alert id '${id}' missing from modules`)
        .toContain(`id: '${id}'`);
    }
  });
});
