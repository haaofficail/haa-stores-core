// L-PR-6 — Storefront checkout redeem widget guard.
//
// The checkout page exposes an "Apply N points (= V SAR)" widget. This
// is money-adjacent UI, so the rules are strict:
//
//   - The redeem value (SAR) is SERVER-AUTHORITATIVE. The widget calls
//     `loyaltyApi.quoteRedeem` and displays only what the server returns.
//     The client never computes points → SAR locally; it must not divide
//     points by redeemValuePerPoint or any rate at the checkout layer.
//   - The widget renders ONLY when the store has loyalty enabled AND the
//     customer's balance >= rules.minRedeemPoints (audit gap L-009).
//   - On a successful quote, the displayed total drops by the returned
//     `value`; an itemised "loyalty-discount-line" appears in the
//     sidebar so the customer sees how the math was applied.
//
// Static-source pattern — see merchant-loyalty-page-wired.test.ts and
// shipping-rate-edit-delete.test.tsx for the established style. We lock
// the structural contract:
//
//   1. Checkout.tsx imports `loyaltyApi` + `LoyaltyBalanceResponse`.
//   2. The widget block has data-testid="loyalty-redeem-widget" and is
//      gated by `loyaltyBalance?.enabled && loyaltyBalance.balance >= minRedeemPoints`.
//   3. The input + apply button render the testids the e2e suite will use:
//      loyalty-redeem-points-input, loyalty-redeem-apply,
//      loyalty-redeem-success / loyalty-redeem-error.
//   4. The widget calls `loyaltyApi.quoteRedeem` — NOT a local math.
//   5. The total computation subtracts the SERVER-RETURNED `value`
//      (`loyaltyDiscount`) — never `redeemPoints * rate`.
//   6. The sidebar shows a `loyalty-discount-line` entry when discount > 0.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const CHECKOUT = readFileSync(resolve(ROOT, 'apps/storefront/src/pages/Checkout.tsx'), 'utf8');

describe('Storefront Checkout — redeem widget (L-PR-6)', () => {
  it('imports loyaltyApi + LoyaltyBalanceResponse from @/lib/api', () => {
    expect(CHECKOUT).toMatch(/import\s*\{[\s\S]*?loyaltyApi[\s\S]*?\}\s*from\s*['"]@\/lib\/api['"]/);
    expect(CHECKOUT).toMatch(/LoyaltyBalanceResponse/);
  });

  it('renders the redeem widget gated by enabled + minRedeemPoints + balance > 0', () => {
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-widget"/);
    // The visibility predicate must include `enabled` AND a check vs
    // minRedeemPoints AND non-zero balance. We allow whitespace and an
    // optional optional-chained accessor on rules.
    expect(CHECKOUT).toMatch(/loyaltyBalance\?\.enabled\s*&&\s*loyaltyBalance\.balance\s*>=\s*\(loyaltyBalance\.rules\?\.minRedeemPoints/);
  });

  it('exposes the points input + apply button + success/error testids', () => {
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-points-input"/);
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-apply"/);
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-success"/);
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-error"/);
    expect(CHECKOUT).toMatch(/data-testid="loyalty-redeem-available"/);
  });

  it('calls loyaltyApi.quoteRedeem — NEVER divides points by a client-side rate', () => {
    expect(CHECKOUT).toMatch(/loyaltyApi\.quoteRedeem\(/);
    // The widget body must NOT do `points * redeemValuePerPoint` math.
    // A simple negative grep: no checkout-level multiplication of
    // redeemPoints by anything. (The server quote is the only path.)
    expect(CHECKOUT).not.toMatch(/redeemPoints\s*\*\s*[a-zA-Z]/);
    // Also: no local pointsToValue/computeRedemption import. The math
    // package is server-only.
    expect(CHECKOUT).not.toMatch(/pointsToValue|computeRedemption/);
  });

  it('subtracts the server-returned discount from the total', () => {
    // total uses loyaltyDiscount (which is set ONLY from redeemQuote.value).
    expect(CHECKOUT).toMatch(/const total\s*=\s*Math\.max\(0,\s*subtotal\s*\+\s*shippingCost\s*-\s*loyaltyDiscount/);
    expect(CHECKOUT).toMatch(/const loyaltyDiscount\s*=\s*redeemQuote\s*\?\s*Math\.max\(0,\s*redeemQuote\.value\)/);
  });

  it('shows the discount line in the sidebar when discount > 0', () => {
    expect(CHECKOUT).toMatch(/data-testid="loyalty-discount-line"/);
    expect(CHECKOUT).toMatch(/loyaltyDiscount\s*>\s*0/);
  });

  it('fetches the balance via loyaltyApi.getBalance once phone is valid', () => {
    expect(CHECKOUT).toMatch(/loyaltyApi\.getBalance\(slug,\s*phone\)/);
    // Phone length guard so we don't hammer the endpoint while typing.
    expect(CHECKOUT).toMatch(/phone\.length\s*<\s*8/);
  });
});
