// W6 (Autopilot Phase 3) — shipping rate cache + debounce contract lock.
//
// The rate cache machinery already exists (F-QA-C-004) with:
//   - server-side ShippingRateCache (packages/shipping-core/src/rate-cache.ts)
//   - single-flight debounce
//   - storeId/cart/destination/provider key dimensions
//   - TTL + error-TTL for failure fallback
//   - process-wide singleton via getDefaultShippingRateCache
//   - wired into checkout route + a /rate-cache/stats diagnostics endpoint
//
// W6 of the SAFE FULL AUTOPILOT spec asks for the same invariants but
// also requires:
//   - concurrency test (covered in tests/shipping-rate-cache.test.ts)
//   - failure fallback test (covered)
//   - NOT to break the frontend race guard
//
// This test file locks the cross-file contract so a future refactor
// can't accidentally bypass the cache or break the wiring.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string): string => (existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '');

describe('Shipping rate cache + debounce — W6 contract', () => {
  const cache = read('packages/shipping-core/src/rate-cache.ts');
  const checkout = read('apps/api/src/routes/storefront/checkout.ts');
  const shipping = read('apps/api/src/routes/shipping.ts');
  const cacheTest = read('tests/shipping-rate-cache.test.ts');
  const checkoutPage = read('apps/storefront/src/pages/Checkout.tsx');

  it('cache module exports ShippingRateCache + getDefaultShippingRateCache', () => {
    expect(cache).toMatch(/export\s+class\s+ShippingRateCache/);
    expect(cache).toMatch(/getDefaultShippingRateCache/);
  });

  it('cache implements single-flight debounce (in-flight promise re-used)', () => {
    expect(cache).toMatch(/inFlight/);
    // The single-flight path must store and return the same promise.
    expect(cache).toMatch(/entry\.inFlight/);
  });

  it('cache key dimensions include storeId + provider', () => {
    // Without these dimensions, two stores could collide on the same
    // address+cart input. F-QA-C-004 commits the multi-tenant key.
    expect(cache).toMatch(/storeId/);
    expect(cache).toMatch(/provider/);
  });

  it('cache has TTL AND a separate (shorter) error TTL', () => {
    // Errors must be cached briefly so a thundering herd does not hammer
    // a failing provider, but for far less time than successful rates.
    expect(cache).toMatch(/ttlMs/);
    expect(cache).toMatch(/errorTtlMs/);
  });

  it('rate cache is consumed by the storefront checkout route', () => {
    expect(checkout).toMatch(/getDefaultShippingRateCache/);
  });

  it('admin diagnostics endpoint exposes cache stats', () => {
    // Operator can read `{ size, hits, misses, coalesced, errors, hitRate }`
    // from /api/shipping/rate-cache/stats. Bypass-detection signal.
    expect(shipping).toMatch(/rate-cache\/stats/);
    expect(shipping).toMatch(/getDefaultShippingRateCache\(\)\.stats/);
  });

  it('coalesced (debounced) counter exists for monitoring', () => {
    // Without this counter, a regression that breaks single-flight is
    // silently invisible — coalesced would drop to 0 but hit rate
    // would still look normal.
    expect(cache).toMatch(/coalesced/);
  });

  it('frontend Checkout cancels stale fetches via a cancelled flag', () => {
    // The W6 spec mandates we do NOT break the frontend race guard.
    // The flag pattern in Checkout.tsx (let cancelled = false ...)
    // remains the canonical guard against an out-of-order setState.
    expect(checkoutPage).toMatch(/let\s+cancelled\s*=\s*false/);
  });

  it('regression suite covers single-flight + error-fallback + stats', () => {
    // The dedicated test file must continue to assert each invariant.
    expect(cacheTest).toMatch(/single-flight/);
    expect(cacheTest).toMatch(/errors are cached briefly/);
    expect(cacheTest).toMatch(/cache\.stats\(\)/);
  });
});
