import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOYALTY_RULES,
  computeEarnedPoints,
  computeRedemption,
  pointsToValue,
  valueToPoints,
  computeExpiry,
  type LoyaltyRules,
} from '../packages/loyalty-core/src/index.ts';

const rules = (over: Partial<LoyaltyRules> = {}): LoyaltyRules => ({
  ...DEFAULT_LOYALTY_RULES,
  enabled: true,
  ...over,
});

describe('loyalty-core earn (QA Loyalty)', () => {
  it('earns floor(subtotal * rate), excludes tax/shipping by default', () => {
    expect(computeEarnedPoints(rules({ earnRatePerCurrency: 1 }), { subtotal: 199.9, tax: 30, shipping: 15 })).toBe(199);
  });

  it('includes tax/shipping when configured', () => {
    expect(computeEarnedPoints(rules({ earnOnTax: true, earnOnShipping: true }), { subtotal: 100, tax: 15, shipping: 20 })).toBe(135);
  });

  it('earns nothing when disabled or below min order', () => {
    expect(computeEarnedPoints(rules({ enabled: false }), { subtotal: 100 })).toBe(0);
    expect(computeEarnedPoints(rules({ minOrderForEarn: 200 }), { subtotal: 100, tax: 15 })).toBe(0);
    expect(computeEarnedPoints(rules({ minOrderForEarn: 100 }), { subtotal: 90, tax: 15 })).toBe(105 >= 100 ? 90 : 0); // total 105 >= 100 → earns on subtotal 90
  });

  it('handles NaN / negative amounts safely', () => {
    expect(computeEarnedPoints(rules(), { subtotal: NaN })).toBe(0);
    expect(computeEarnedPoints(rules(), { subtotal: -50 })).toBe(0);
  });
});

describe('loyalty-core value conversions', () => {
  it('pointsToValue and valueToPoints are consistent', () => {
    const r = rules({ redeemValuePerPoint: 0.01 });
    expect(pointsToValue(r, 100)).toBe(1);
    expect(pointsToValue(r, 250)).toBe(2.5);
    expect(valueToPoints(r, 1)).toBe(100);
    expect(valueToPoints(r, 2.4)).toBe(240);
  });

  it('value rounds DOWN to avoid over-crediting the customer', () => {
    expect(pointsToValue(rules({ redeemValuePerPoint: 0.0033 }), 100)).toBe(0.33); // 0.33 not 0.34
  });
});

describe('loyalty-core redemption (QA Loyalty)', () => {
  it('clamps to available balance', () => {
    const r = computeRedemption(rules(), { requestedPoints: 5000, availablePoints: 300, orderTotal: 1000 });
    expect(r.points).toBe(300);
    expect(r.value).toBe(3);
  });

  it('caps at maxRedeemPercent of order total', () => {
    // order 100, max 50% = 50 SAR = 5000 points cap
    const r = computeRedemption(rules({ maxRedeemPercent: 0.5 }), { requestedPoints: 9000, availablePoints: 9000, orderTotal: 100 });
    expect(r.value).toBe(50);
    expect(r.points).toBe(5000);
  });

  it('rejects below minimum', () => {
    expect(computeRedemption(rules({ minRedeemPoints: 100 }), { requestedPoints: 50, availablePoints: 999, orderTotal: 100 }).reason).toBe('below_min');
  });

  it('rejects when balance below minimum', () => {
    expect(computeRedemption(rules({ minRedeemPoints: 100 }), { requestedPoints: 100, availablePoints: 80, orderTotal: 100 }).reason).toBe('insufficient_balance');
  });

  it('rejects when disabled', () => {
    expect(computeRedemption(rules({ enabled: false }), { requestedPoints: 500, availablePoints: 500, orderTotal: 100 }).reason).toBe('disabled');
  });

  it('rejects when order cap pushes points below minimum', () => {
    // order 10, 50% = 5 SAR = 500 points cap, but min is 1000 → below_min
    const r = computeRedemption(rules({ minRedeemPoints: 1000, maxRedeemPercent: 0.5 }), { requestedPoints: 5000, availablePoints: 5000, orderTotal: 10 });
    expect(r.reason).toBe('below_min');
    expect(r.points).toBe(0);
  });
});

describe('loyalty-core expiry (QA Loyalty)', () => {
  it('never expires when pointsExpiryMonths is 0', () => {
    const lots = [{ points: 100, earnedAt: new Date('2020-01-01') }];
    expect(computeExpiry(rules({ pointsExpiryMonths: 0 }), lots, new Date('2026-01-01'))).toEqual({ expiredPoints: 0, activePoints: 100 });
  });

  it('splits expired vs active lots by 12-month window', () => {
    const lots = [
      { points: 100, earnedAt: new Date('2024-01-01') }, // expired by 2026
      { points: 200, earnedAt: new Date('2025-12-01') }, // still active
    ];
    const r = computeExpiry(rules({ pointsExpiryMonths: 12 }), lots, new Date('2026-06-21'));
    expect(r.expiredPoints).toBe(100);
    expect(r.activePoints).toBe(200);
  });
});
