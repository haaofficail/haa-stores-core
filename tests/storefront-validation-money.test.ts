import { describe, it, expect } from 'vitest';
import { normalizeStoreSlug, isSaudiPhone } from '../apps/storefront/src/lib/validation';
import { toMoneyNumber, formatAmount, safeMaxQty } from '../apps/storefront/src/lib/money';

describe('Auth validation (QA B6)', () => {
  it('normalizeStoreSlug handles Arabic names without empty/whitespace junk', () => {
    expect(normalizeStoreSlug('متجر الأناقة')).not.toContain(' ');
    expect(normalizeStoreSlug('My Cool Store!!')).toBe('my-cool-store');
    expect(normalizeStoreSlug('  --Trim--  ')).toBe('trim');
    expect(normalizeStoreSlug('a'.repeat(80)).length).toBeLessThanOrEqual(50);
  });
  it('normalizeStoreSlug never returns an empty slug for a non-empty Arabic name (QA AU1)', () => {
    const a = normalizeStoreSlug('متجر الأناقة');
    expect(a.length).toBeGreaterThan(0);
    expect(a).toMatch(/^store-[a-z0-9]+$/); // stable fallback
    // stable + deterministic: same input → same slug
    expect(normalizeStoreSlug('متجر الأناقة')).toBe(a);
    // different Arabic names → different fallbacks
    expect(normalizeStoreSlug('بيت العود')).not.toBe(a);
    // truly empty input stays empty (caller decides)
    expect(normalizeStoreSlug('   ')).toBe('');
  });
  it('isSaudiPhone enforces 05XXXXXXXX', () => {
    expect(isSaudiPhone('0512345678')).toBe(true);
    expect(isSaudiPhone(' 0512345678 ')).toBe(true);
    expect(isSaudiPhone('512345678')).toBe(false);
    expect(isSaudiPhone('05123')).toBe(false);
    expect(isSaudiPhone('+966512345678')).toBe(false);
    expect(isSaudiPhone('')).toBe(false);
  });
});

describe('Money helpers (QA B5 / Cart)', () => {
  it('toMoneyNumber never yields NaN', () => {
    expect(toMoneyNumber('12.5')).toBe(12.5);
    expect(toMoneyNumber(null)).toBe(0);
    expect(toMoneyNumber(undefined)).toBe(0);
    expect(toMoneyNumber('abc')).toBe(0);
  });
  it('formatAmount is NaN-safe with 2 decimals', () => {
    expect(formatAmount('abc')).toBe('0.00');
    expect(formatAmount(10)).toBe('10.00');
  });
  it('safeMaxQty: stock 0 does NOT become 1, undefined does NOT become NaN', () => {
    expect(safeMaxQty(true, 0)).toBe(0);          // out of stock → 0 (no purchase)
    expect(safeMaxQty(true, undefined)).toBe(0);  // no NaN
    expect(safeMaxQty(true, 5)).toBe(5);
    expect(safeMaxQty(false, 0)).toBe(99);        // untracked → cap
  });
});
