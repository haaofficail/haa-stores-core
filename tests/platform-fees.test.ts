// Configurable Platform Fee Policy — calcPlatformFee unit tests
//
// Pure unit tests (no DB). Cover all four modes, edge cases, and the
// validation contract for the admin PATCH endpoint.

import { describe, it, expect } from 'vitest';
import {
  calcPlatformFee,
  normalizePlatformFeePolicy,
  describePlatformFeePolicy,
  validatePlatformFeePolicyInput,
  DEFAULT_PLATFORM_FEE_POLICY,
  PLATFORM_FEE_MODES,
  MAX_PLATFORM_FEE_PCT,
} from '@haa/wallet-core';

describe('calcPlatformFee — pure unit', () => {
  describe('mode=none', () => {
    it('returns 0 for any positive order total', () => {
      expect(calcPlatformFee(100, { mode: 'none', pct: null, fixed: null, enabled: true })).toBe(0);
      expect(calcPlatformFee(9999.99, { mode: 'none', pct: null, fixed: null, enabled: true })).toBe(0);
    });
  });

  describe('mode=percentage', () => {
    it('returns 2% of order total', () => {
      expect(calcPlatformFee(100, { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true })).toBe(2);
    });
    it('returns 1% of order total', () => {
      expect(calcPlatformFee(500, { mode: 'percentage', pct: 0.01, fixed: 0, enabled: true })).toBe(5);
    });
    it('rounds to 2 decimal places (currency cents)', () => {
      // 33.33 * 0.02 = 0.6666 → 0.67
      expect(calcPlatformFee(33.33, { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true })).toBe(0.67);
    });
    it('returns 0 when pct is 0', () => {
      expect(calcPlatformFee(100, { mode: 'percentage', pct: 0, fixed: 0, enabled: true })).toBe(0);
    });
    it('returns 0 when pct is null', () => {
      expect(calcPlatformFee(100, { mode: 'percentage', pct: null, fixed: 0, enabled: true })).toBe(0);
    });
  });

  describe('mode=fixed', () => {
    it('returns the fixed amount regardless of order total', () => {
      expect(calcPlatformFee(100, { mode: 'fixed', pct: null, fixed: 1.5, enabled: true })).toBe(1.5);
      expect(calcPlatformFee(9999, { mode: 'fixed', pct: null, fixed: 1.5, enabled: true })).toBe(1.5);
    });
    it('returns 0 when fixed is null', () => {
      expect(calcPlatformFee(100, { mode: 'fixed', pct: null, fixed: null, enabled: true })).toBe(0);
    });
  });

  describe('mode=percentage_plus_fixed', () => {
    it('returns pct + fixed', () => {
      // 500 * 0.02 = 10, plus 1.5 = 11.5
      expect(calcPlatformFee(500, { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1.5, enabled: true })).toBe(11.5);
    });
    it('handles zero in either component', () => {
      expect(calcPlatformFee(500, { mode: 'percentage_plus_fixed', pct: 0, fixed: 1.5, enabled: true })).toBe(1.5);
      expect(calcPlatformFee(500, { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 0, enabled: true })).toBe(10);
    });
  });

  describe('enabled flag overrides everything', () => {
    it('returns 0 when enabled=false even if mode/pct/fixed are set', () => {
      expect(calcPlatformFee(100, { mode: 'percentage', pct: 0.5, fixed: 0, enabled: false })).toBe(0);
      expect(calcPlatformFee(100, { mode: 'fixed', pct: null, fixed: 99, enabled: false })).toBe(0);
    });
  });

  describe('defensive guards', () => {
    it('returns 0 for zero/negative order total', () => {
      expect(calcPlatformFee(0, DEFAULT_PLATFORM_FEE_POLICY)).toBe(0);
      expect(calcPlatformFee(-10, DEFAULT_PLATFORM_FEE_POLICY)).toBe(0);
    });
    it('returns 0 for non-finite order total', () => {
      expect(calcPlatformFee(NaN, DEFAULT_PLATFORM_FEE_POLICY)).toBe(0);
      expect(calcPlatformFee(Infinity, DEFAULT_PLATFORM_FEE_POLICY)).toBe(0);
    });
    it('clamps negative pct to 0', () => {
      expect(calcPlatformFee(100, { mode: 'percentage', pct: -0.5, fixed: 0, enabled: true })).toBe(0);
    });
    it('clamps negative fixed to 0', () => {
      expect(calcPlatformFee(100, { mode: 'fixed', pct: null, fixed: -10, enabled: true })).toBe(0);
    });
  });
});

describe('normalizePlatformFeePolicy', () => {
  it('uses defaults for an empty input', () => {
    const p = normalizePlatformFeePolicy({});
    expect(p.mode).toBe('percentage');
    expect(p.pct).toBeNull();
    expect(p.fixed).toBeNull();
    expect(p.enabled).toBe(true);
  });
  it('coerces string pct/fixed from DB rows', () => {
    const p = normalizePlatformFeePolicy({
      platformFeeMode: 'percentage',
      platformFeePct: '0.025',
      platformFeeFixed: '1.5',
      isPlatformFeeEnabled: true,
    });
    expect(p.pct).toBe(0.025);
    expect(p.fixed).toBe(1.5);
  });
  it('falls back to "percentage" for unknown modes', () => {
    const p = normalizePlatformFeePolicy({ platformFeeMode: 'weird_mode' });
    expect(p.mode).toBe('percentage');
  });
  it('treats null isPlatformFeeEnabled as enabled', () => {
    const p = normalizePlatformFeePolicy({ isPlatformFeeEnabled: null });
    expect(p.enabled).toBe(true);
  });
});

describe('describePlatformFeePolicy', () => {
  it('renders percentage', () => {
    expect(describePlatformFeePolicy({ mode: 'percentage', pct: 0.02, fixed: 0, enabled: true })).toBe('2%');
  });
  it('renders fixed', () => {
    expect(describePlatformFeePolicy({ mode: 'fixed', pct: null, fixed: 1.5, enabled: true })).toBe('1.50 ر.س');
  });
  it('renders percentage_plus_fixed', () => {
    expect(describePlatformFeePolicy({ mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1, enabled: true })).toBe('2% + 1.00 ر.س');
  });
  it('renders none and disabled distinctly', () => {
    expect(describePlatformFeePolicy({ mode: 'none', pct: null, fixed: null, enabled: true })).toBe('معفى');
    expect(describePlatformFeePolicy({ mode: 'percentage', pct: 0.02, fixed: 0, enabled: false })).toBe('معطّلة');
  });
});

describe('validatePlatformFeePolicyInput', () => {
  it('accepts valid percentage policy', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: 0.02 });
    expect(r.ok).toBe(true);
  });
  it('rejects unknown mode', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'wild' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/وضع رسوم المنصة/);
  });
  it('rejects negative pct', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: -0.01 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/نسبة رسوم المنصة لا يمكن أن تكون سالبة/);
  });
  it('rejects negative fixed', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'fixed', platformFeeFixed: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/الرسم الثابت/);
  });
  it('rejects percentage mode with no pct', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: 0 });
    expect(r.ok).toBe(false);
  });
  it('rejects fixed mode with no fixed', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'fixed', platformFeeFixed: 0 });
    expect(r.ok).toBe(false);
  });
  it('accepts percentage_plus_fixed with either component', () => {
    expect(validatePlatformFeePolicyInput({ platformFeeMode: 'percentage_plus_fixed', platformFeePct: 0.02 }).ok).toBe(true);
    expect(validatePlatformFeePolicyInput({ platformFeeMode: 'percentage_plus_fixed', platformFeeFixed: 1.5 }).ok).toBe(true);
  });
  it('rejects percentage_plus_fixed with both zero', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage_plus_fixed', platformFeePct: 0, platformFeeFixed: 0 });
    expect(r.ok).toBe(false);
  });

  // ── Hard cap (50%) — defense-in-depth with DB CHECK constraint ────────
  it('MAX_PLATFORM_FEE_PCT is 0.5 (50%)', () => {
    expect(MAX_PLATFORM_FEE_PCT).toBe(0.5);
  });
  it('accepts pct at the cap (exactly 0.5)', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: 0.5 });
    expect(r.ok).toBe(true);
  });
  it('rejects pct just above the cap (0.500001)', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: 0.500001 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/الحد الأقصى/);
  });
  it('rejects pct = 1.0 (100% — merchant would be zeroed out)', () => {
    const r = validatePlatformFeePolicyInput({ platformFeeMode: 'percentage', platformFeePct: 1.0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/الحد الأقصى/);
  });
  it('rejects pct in percentage_plus_fixed mode if it exceeds the cap', () => {
    const r = validatePlatformFeePolicyInput({
      platformFeeMode: 'percentage_plus_fixed',
      platformFeePct: 0.6,
      platformFeeFixed: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/الحد الأقصى/);
  });
});

describe('PLATFORM_FEE_MODES is the canonical list', () => {
  it('contains all 4 modes', () => {
    expect(PLATFORM_FEE_MODES).toEqual(['none', 'percentage', 'fixed', 'percentage_plus_fixed']);
  });
});
