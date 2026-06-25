// Subscription proration — days-based formula contract.
//
// The original implementation charged `(newPrice - oldPrice) / 2`
// regardless of when in the billing cycle the merchant upgraded.
// A merchant on day 1 paid the same as a merchant on day 29 of a
// 30-day cycle — overcharging the late upgrader and undercharging
// the early one.
//
// The fix computes the prorated amount against the days remaining
// in the merchant's CURRENT period:
//
//   prorated = (newPrice - oldPrice) × (remainingDays / periodDays)
//
// Audit reference: P0 #3 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/subscriptions.ts'),
  'utf-8',
);

describe('Subscription proration — days-based', () => {
  it('the buggy `(newPrice - oldPrice) / 2` formula is gone', () => {
    expect(SRC).not.toMatch(/\(\s*newPrice\s*-\s*oldPrice\s*\)\s*\/\s*2/);
  });

  it('the new formula multiplies by remainingDays / periodDays', () => {
    expect(SRC).toMatch(/newPrice\s*-\s*oldPrice\)\s*\*\s*remainingDays\)\s*\/\s*periodDays/);
  });

  it('periodDays is 30 for monthly and 365 for annual', () => {
    expect(SRC).toMatch(/periodDays\s*=\s*currentCycle\s*===\s*['"]annual['"]\s*\?\s*365\s*:\s*30/);
  });

  it('remainingDays reads the OLD period end (saved before the upgrade query)', () => {
    // The proration window is the part of the OLD cycle the merchant
    // has not yet consumed — `subscription.currentPeriodEnd` (not
    // `updated.currentPeriodEnd`, which is the post-upgrade renewal).
    expect(SRC).toMatch(/subscription\.currentPeriodEnd/);
  });

  it('remainingDays is clamped to [0, periodDays]', () => {
    // Math.max(0, …) prevents negative-day proration when the cycle
    // had already lapsed. Math.min(periodDays, …) prevents overshoot
    // when fallback math takes over.
    expect(SRC).toMatch(/Math\.max\(0,\s*oldPeriodEndMs\s*-\s*now\.getTime\(\)\)/);
    expect(SRC).toMatch(/Math\.min\(periodDays,\s*Math\.ceil\(msRemaining\s*\/\s*86400000\)\)/);
  });
});
