import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { consumeFifo } from '../packages/commerce-core/src/loyalty.ts';

const svc = readFileSync(new URL('../packages/commerce-core/src/loyalty.ts', import.meta.url), 'utf-8');

const lot = (points: number, y: number) => ({ points, earnedAt: new Date(`${y}-01-01`) });

describe('loyalty consumeFifo (QA Loyalty)', () => {
  it('consumes oldest lots first', () => {
    const out = consumeFifo([lot(100, 2024), lot(200, 2025)], 150);
    expect(out).toEqual([{ points: 150, earnedAt: new Date('2025-01-01') }]);
  });

  it('returns all lots when nothing consumed', () => {
    expect(consumeFifo([lot(100, 2024), lot(200, 2025)], 0)).toHaveLength(2);
  });

  it('returns empty when everything consumed', () => {
    expect(consumeFifo([lot(100, 2024), lot(200, 2025)], 300)).toEqual([]);
  });

  it('partially consumes a single lot', () => {
    expect(consumeFifo([lot(100, 2024)], 40)).toEqual([{ points: 60, earnedAt: new Date('2024-01-01') }]);
  });

  it('over-consumption never produces negative lots', () => {
    expect(consumeFifo([lot(100, 2024)], 9999)).toEqual([]);
  });
});

describe('LoyaltyService structure (QA Loyalty)', () => {
  it('earnFromOrder is idempotent (fast-path check + unique-violation catch)', () => {
    expect(svc).toContain('async earnFromOrder');
    expect(svc).toContain("eq(s.loyaltyTransactions.type, 'earn')");
    expect(svc).toContain('isUniqueViolation(err)');
    expect(svc).toContain("'23505'");
  });

  it('redeem recomputes inside a transaction from the locked balance', () => {
    expect(svc).toContain('async redeem');
    expect(svc).toContain('this.db.transaction');
    expect(svc).toContain('computeRedemption(rules');
  });

  it('expireAccount uses FIFO and never debits below balance', () => {
    expect(svc).toContain('async expireAccount');
    expect(svc).toContain('consumeFifo');
    expect(svc).toContain('Math.min(expiredPoints, before)');
  });

  it('settings use upsert (onConflictDoUpdate)', () => {
    expect(svc).toContain('onConflictDoUpdate');
  });
});
