// Coupon atomic-claim contract.
//
// Previously: `validate()` (SELECT) and `incrementUsed()` (unconditional
// UPDATE) ran as two separate statements. Two concurrent checkouts
// claiming the same `maxUses=1` coupon would both pass validation and
// both UPDATE, taking `usedCount` from 0 to 2 — the coupon would be
// used twice.
//
// Fix: `tryClaimUse` performs an atomic
//   `UPDATE … SET usedCount = usedCount + 1
//    WHERE id = ? AND storeId = ?
//      AND (maxUses IS NULL OR usedCount < maxUses)
//    RETURNING id`
// and returns whether the row was actually updated. Only one concurrent
// transaction can succeed.
//
// Audit reference: P0 #2 in the dashboard-quality audit (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COUPONS_SRC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/coupons.ts'),
  'utf-8',
);
const CHECKOUT_SRC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/checkout.ts'),
  'utf-8',
);

describe('Coupon atomic claim — service contract', () => {
  it('exposes a tryClaimUse method', () => {
    expect(COUPONS_SRC).toMatch(/async\s+tryClaimUse\s*\(\s*storeId:\s*number,\s*couponId:\s*number\s*\)\s*:\s*Promise<boolean>/);
  });

  it('tryClaimUse enforces the cap inside the UPDATE WHERE', () => {
    // The WHERE clause MUST include the `usedCount < maxUses` guard
    // so the database — not the application — decides whether the
    // claim is allowed. Without this, two concurrent UPDATEs both
    // succeed.
    expect(COUPONS_SRC).toMatch(
      /sql`\(\$\{s\.coupons\.maxUses\}\s+IS\s+NULL\s+OR\s+\$\{s\.coupons\.usedCount\}\s+<\s+\$\{s\.coupons\.maxUses\}\)`/,
    );
  });

  it('tryClaimUse uses RETURNING and checks the result length', () => {
    // `result.length === 0` is the signal that the cap was hit. The
    // old code had no such signal because it used an unconditional
    // UPDATE.
    const block = COUPONS_SRC.slice(
      COUPONS_SRC.indexOf('async tryClaimUse'),
      COUPONS_SRC.indexOf('@deprecated Use {@link tryClaimUse}'),
    );
    expect(block).toMatch(/\.returning\(/);
    expect(block).toMatch(/result\.length\s*>\s*0/);
  });

  it('keeps incrementUsed for back-compat but marks it deprecated', () => {
    // Admin manual adjustments (outside checkout) still use the
    // unconditional path. Checkout MUST not.
    expect(COUPONS_SRC).toMatch(/@deprecated.*tryClaimUse/s);
    expect(COUPONS_SRC).toMatch(/async\s+incrementUsed/);
  });
});

describe('Coupon atomic claim — checkout call sites', () => {
  it('NO checkout site uses the unsafe incrementUsed', () => {
    // If any checkout call site reverts to incrementUsed, the race
    // returns. Source-grep enforces that all three coupon-claiming
    // checkout branches switched to tryClaimUse.
    const block = CHECKOUT_SRC;
    expect(block).not.toMatch(/couponService\.incrementUsed/);
  });

  it('every checkout claim throws COUPON_EXHAUSTED on a false return', () => {
    // The whole point of tryClaimUse is that the caller MUST refuse
    // the order when the claim fails. Three checkout branches exist
    // (instant, fake-payment, pending-payment) — all three must
    // throw to roll back the order transaction.
    const occurrences = CHECKOUT_SRC.match(/COUPON_EXHAUSTED/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
  });

  it('every checkout coupon claim is constructed with the transaction (tx)', () => {
    // Read-only pre-flight (line ~116: compute discount preview
    // before creating an order) may still use `this.db` — no claim
    // happens. But every site that actually calls `tryClaimUse` MUST
    // construct the service with `tx`, so the claim is part of the
    // same atomic transaction as order creation. A tx rollback then
    // unwinds the claim too.
    //
    // The simplest invariant: there must be at least 3 occurrences of
    // `new CouponsService(tx)` (one per checkout branch), matching
    // the 3 occurrences of `tryClaimUse`.
    const txCtors = CHECKOUT_SRC.match(/new\s+CouponsService\(\s*tx\s*\)/g) ?? [];
    const claims = CHECKOUT_SRC.match(/couponService\.tryClaimUse\(/g) ?? [];
    expect(txCtors.length).toBe(claims.length);
    expect(txCtors.length).toBeGreaterThanOrEqual(3);
  });
});
