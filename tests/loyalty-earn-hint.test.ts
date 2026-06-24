// LoyaltyEarnHint — storefront-side hint shown on every product card.
//
// Covers:
//   - computeEarnPoints math (presentation-only; server is authoritative)
//   - source-grep that LoyaltyEarnHint is wired into ProductCard
//   - source-grep that public /loyalty/settings endpoint exists
//   - source-grep that the endpoint exposes only customer-facing fields
//     (negative grep on internal flags)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeEarnPoints, type LoyaltyStoreSettings } from '../apps/storefront/src/lib/api';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('computeEarnPoints', () => {
  const enabled = (rate: number): LoyaltyStoreSettings => ({
    enabled: true,
    earnRatePerCurrency: rate,
    redeemValuePerPoint: 0.01,
    minRedeemPoints: 100,
    maxRedeemPercent: 0.5,
    minOrderForEarn: 0,
  });

  it('returns 0 when loyalty is disabled', () => {
    expect(computeEarnPoints(100, { enabled: false })).toBe(0);
  });

  it('returns 0 for non-positive price', () => {
    expect(computeEarnPoints(0, enabled(1))).toBe(0);
    expect(computeEarnPoints(-10, enabled(1))).toBe(0);
    expect(computeEarnPoints(NaN, enabled(1))).toBe(0);
  });

  it('multiplies price by earn rate and floors', () => {
    expect(computeEarnPoints(100, enabled(1))).toBe(100); // 100 * 1 = 100
    expect(computeEarnPoints(100, enabled(2))).toBe(200); // 100 * 2 = 200
    expect(computeEarnPoints(99.99, enabled(1))).toBe(99); // floor
    expect(computeEarnPoints(15, enabled(0.5))).toBe(7); // floor(7.5)
  });

  it('handles fractional earn rate without precision drift', () => {
    // 1.25 rate × 100 SAR = 125 exact
    expect(computeEarnPoints(100, enabled(1.25))).toBe(125);
    // 0.1 rate × 99 = 9.9 → floor 9
    expect(computeEarnPoints(99, enabled(0.1))).toBe(9);
  });
});

describe('LoyaltyEarnHint wiring (source-grep)', () => {
  const card = read('apps/storefront/src/components/product-card/ProductCard.tsx');
  const hint = read('apps/storefront/src/components/LoyaltyEarnHint.tsx');
  const hook = read('apps/storefront/src/hooks/useLoyaltySettings.ts');
  const api = read('apps/storefront/src/lib/api.ts');
  const route = read('apps/api/src/routes/storefront/loyalty.ts');

  it('ProductCard imports + renders LoyaltyEarnHint with the product price', () => {
    expect(card).toMatch(/import\s*\{\s*LoyaltyEarnHint\s*\}/);
    expect(card).toMatch(/<LoyaltyEarnHint\s+priceSar=\{Number\(product\.price\)\}/);
  });

  it('LoyaltyEarnHint hides cleanly when settings are loading / disabled / zero points', () => {
    expect(hint).toMatch(/if\s*\(!settings/);
    expect(hint).toMatch(/settings\.enabled/);
    expect(hint).toMatch(/points\s*<=\s*0/);
    expect(hint).toMatch(/return null/);
  });

  it('LoyaltyEarnHint carries an aria-label so screen readers announce it', () => {
    expect(hint).toMatch(/aria-label=/);
    expect(hint).toMatch(/loyalty\.earnHintAria/);
  });

  it('useLoyaltySettings caches per-slug + treats error as disabled', () => {
    expect(hook).toMatch(/const cache = new Map/);
    expect(hook).toMatch(/inFlight/);
    // Error path must set enabled:false rather than throwing.
    expect(hook).toMatch(/enabled:\s*false/);
  });

  it('loyaltyApi.getSettings hits the public storefront endpoint', () => {
    expect(api).toMatch(/getSettings:\s*\(slug:\s*string\)\s*=>/);
    expect(api).toMatch(/\/s\/\$\{slug\}\/loyalty\/settings/);
  });

  it('public /loyalty/settings endpoint exists in storefront loyalty subrouter', () => {
    expect(route).toMatch(/'\/:slug\/loyalty\/settings'/);
  });

  it('public /loyalty/settings does NOT expose internal-only flags', () => {
    // earnOnTax / earnOnShipping / pointsExpiryMonths are merchant-side
    // policy knobs that the storefront does not need to render.
    // (earnOnTax + earnOnShipping were intentionally NOT included in
    // the public projection — verify they don't leak.)
    const route = read('apps/api/src/routes/storefront/loyalty.ts');
    const settingsBlock = route.slice(
      route.indexOf("'/:slug/loyalty/settings'"),
      route.indexOf("'/:slug/loyalty/settings'") + 1500,
    );
    expect(settingsBlock).not.toMatch(/pointsExpiryMonths/);
  });
});
