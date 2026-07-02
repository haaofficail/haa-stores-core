// P1-13 audit fix — hardcoded "free shipping" claims unrelated to any
// real store configuration.
//
//   - ProductDetail.tsx: `isFreeShipping = true` unconditionally, so
//     EVERY product on EVERY store showed a "free shipping" badge
//     regardless of the store's actual shipping method thresholds.
//   - Cart.tsx: the free-shipping progress bar used a hardcoded 199 SAR
//     threshold instead of the real, destination-dependent
//     `freeAboveAmount` the /checkout/shipping-rates endpoint returns
//     (already used correctly a few lines below for the per-rate label).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PRODUCT_DETAIL = readFileSync(
  resolve(__dirname, '../apps/storefront/src/pages/ProductDetail.tsx'),
  'utf-8',
);
const CART = readFileSync(
  resolve(__dirname, '../apps/storefront/src/pages/Cart.tsx'),
  'utf-8',
);

describe('ProductDetail — free shipping claim', () => {
  it('no longer hardcodes isFreeShipping = true', () => {
    expect(PRODUCT_DETAIL).not.toMatch(/const isFreeShipping = true/);
  });
});

describe('Cart — free shipping threshold', () => {
  it('no longer hardcodes a 199 SAR threshold', () => {
    expect(CART).not.toMatch(/const FREE_SHIPPING = 199/);
  });

  it('derives the threshold from real shippingEstimateRates data (freeAboveAmount)', () => {
    expect(CART).toMatch(/shippingEstimateRates[\s\S]{0,200}freeAboveAmount/);
  });
});
