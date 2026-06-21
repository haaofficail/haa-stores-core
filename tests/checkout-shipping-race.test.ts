import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(new URL('../apps/storefront/src/pages/Checkout.tsx', import.meta.url), 'utf-8');

describe('Checkout shipping-rates race guard (QA review)', () => {
  it('guards stale shipping-rate responses with an incrementing request id', () => {
    expect(src).toContain('shippingReqRef');
    expect(src).toContain('++shippingReqRef.current');
    // only the latest request applies its result
    expect(src).toContain('reqId !== shippingReqRef.current');
  });

  it('keeps a still-valid shipping selection across re-fetches (no blind auto-select override)', () => {
    expect(src).toContain('rates.some((r) => r.shippingMethodId === cur)');
  });
});
