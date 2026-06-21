// Tests for the configurable COD fee policy module.
//
// Mirrors `tests/platform-fees.test.ts` (TASK-0030) structure: each suite
// is independent, names describe behavior, and the import target is the
// pure module — no I/O, no database.
//
// See TASK-0032 in docs/ops/TASK_TRACKER.md for the full spec.

import { describe, it, expect } from 'vitest';
import {
  type CodFeePolicy,
  COD_FEE_MODES,
  DEFAULT_COD_FEE_POLICY,
  MAX_COD_FEE_PCT,
  normalizeCodFeePolicy,
  calcCodFee,
  describeCodFeePolicy,
  validateCodFeePolicyInput,
} from '../packages/wallet-core/src/cod-fees.js';

describe('COD_FEE_MODES', () => {
  it('exports the four expected modes in a stable order', () => {
    expect(COD_FEE_MODES).toEqual(['none', 'percentage', 'fixed', 'percentage_plus_fixed']);
  });
});

describe('DEFAULT_COD_FEE_POLICY', () => {
  it('preserves the legacy 2% behavior so existing merchants see no change', () => {
    expect(DEFAULT_COD_FEE_POLICY).toEqual({
      mode: 'percentage',
      pct: 0.02,
      fixed: 0,
      enabled: true,
    });
  });
});

describe('normalizeCodFeePolicy', () => {
  it('returns the default policy when input is empty', () => {
    expect(normalizeCodFeePolicy({})).toEqual(DEFAULT_COD_FEE_POLICY);
  });

  it('coerces string numerics from the database to numbers', () => {
    const out = normalizeCodFeePolicy({
      codFeeMode: 'percentage',
      codFeePct: '0.025',
      codFeeFixed: '1.50',
      isCodFeeEnabled: 'true' as unknown as boolean,
    });
    expect(out).toEqual({
      mode: 'percentage',
      pct: 0.025,
      fixed: 1.5,
      enabled: true,
    });
  });

  it('falls back to percentage/2% for unknown mode strings', () => {
    const out = normalizeCodFeePolicy({ codFeeMode: 'gibberish' });
    expect(out.mode).toBe('percentage');
    expect(out.pct).toBe(0.02);
  });

  it('treats null pct/fixed as null (not 0)', () => {
    const out = normalizeCodFeePolicy({ codFeePct: null, codFeeFixed: null });
    expect(out.pct).toBeNull();
    expect(out.fixed).toBeNull();
  });

  it('treats missing enabled as true (opt-out, not opt-in)', () => {
    const out = normalizeCodFeePolicy({ isCodFeeEnabled: null });
    expect(out.enabled).toBe(true);
  });

  it('treats explicit false as disabled', () => {
    const out = normalizeCodFeePolicy({ isCodFeeEnabled: false });
    expect(out.enabled).toBe(false);
  });
});

describe('calcCodFee', () => {
  it('returns 0 when policy is disabled', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: false };
    expect(calcCodFee(100, policy)).toBe(0);
  });

  it('returns 0 for non-finite or non-positive order totals', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true };
    expect(calcCodFee(0, policy)).toBe(0);
    expect(calcCodFee(-10, policy)).toBe(0);
    expect(calcCodFee(Number.NaN, policy)).toBe(0);
  });

  it('returns 0 in `none` mode even when enabled', () => {
    const policy: CodFeePolicy = { mode: 'none', pct: 0.02, fixed: 0, enabled: true };
    expect(calcCodFee(100, policy)).toBe(0);
  });

  it('computes percentage mode (2% of 100 = 2.00)', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true };
    expect(calcCodFee(100, policy)).toBe(2.0);
  });

  it('computes fixed mode regardless of order total', () => {
    const policy: CodFeePolicy = { mode: 'fixed', pct: null, fixed: 5, enabled: true };
    expect(calcCodFee(100, policy)).toBe(5.0);
    expect(calcCodFee(7.5, policy)).toBe(5.0);
  });

  it('computes percentage_plus_fixed (pct + fixed)', () => {
    const policy: CodFeePolicy = { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1, enabled: true };
    expect(calcCodFee(100, policy)).toBe(3.0); // 2 + 1
  });

  it('rounds to 2 decimal places (cents)', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.025, fixed: 0, enabled: true };
    // 33.33 * 0.025 = 0.83325 → rounds to 0.83
    expect(calcCodFee(33.33, policy)).toBe(0.83);
  });

  it('clamps negative pct/fixed to 0 (defensive)', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: -0.5, fixed: -10, enabled: true };
    expect(calcCodFee(100, policy)).toBe(0);
  });

  it('treats null pct/fixed as 0', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: null, fixed: null, enabled: true };
    expect(calcCodFee(100, policy)).toBe(0);
  });
});

describe('describeCodFeePolicy', () => {
  it('returns "معطّلة" when policy is disabled', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: false };
    expect(describeCodFeePolicy(policy)).toBe('معطّلة');
  });

  it('returns "معفى" for none mode', () => {
    const policy: CodFeePolicy = { mode: 'none', pct: 0.02, fixed: 0, enabled: true };
    expect(describeCodFeePolicy(policy)).toBe('معفى');
  });

  it('formats percentage as "2%" (no trailing zeros)', () => {
    const policy: CodFeePolicy = { mode: 'percentage', pct: 0.02, fixed: 0, enabled: true };
    expect(describeCodFeePolicy(policy)).toBe('2%');
  });

  it('formats fixed as "5.00 ر.س"', () => {
    const policy: CodFeePolicy = { mode: 'fixed', pct: null, fixed: 5, enabled: true };
    expect(describeCodFeePolicy(policy)).toBe('5.00 ر.س');
  });

  it('formats percentage_plus_fixed as "2% + 1.00 ر.س"', () => {
    const policy: CodFeePolicy = { mode: 'percentage_plus_fixed', pct: 0.02, fixed: 1, enabled: true };
    expect(describeCodFeePolicy(policy)).toBe('2% + 1.00 ر.س');
  });
});

describe('validateCodFeePolicyInput', () => {
  it('accepts a valid percentage policy', () => {
    const result = validateCodFeePolicyInput({
      codFeeMode: 'percentage',
      codFeePct: 0.02,
      codFeeFixed: 0,
      isCodFeeEnabled: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.mode).toBe('percentage');
      expect(result.policy.pct).toBe(0.02);
    }
  });

  it('rejects an unknown mode', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'gibberish', codFeePct: 0.02 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/غير صالح/);
    }
  });

  it('rejects negative percentage', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'percentage', codFeePct: -0.01 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/سالبة/);
    }
  });

  it('rejects percentage above MAX_COD_FEE_PCT (50%)', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'percentage', codFeePct: 0.6 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/الحد الأقصى/);
    }
  });

  it('rejects percentage mode without a pct value', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'percentage', codFeePct: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/يتطلب/);
    }
  });

  it('rejects fixed mode without a fixed value', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'fixed', codFeeFixed: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/يتطلب/);
    }
  });

  it('rejects negative fixed amount', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'fixed', codFeeFixed: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/سالب/);
    }
  });

  it('accepts percentage_plus_fixed with either pct or fixed (or both)', () => {
    const a = validateCodFeePolicyInput({ codFeeMode: 'percentage_plus_fixed', codFeePct: 0.01 });
    expect(a.ok).toBe(true);
    const b = validateCodFeePolicyInput({ codFeeMode: 'percentage_plus_fixed', codFeeFixed: 2 });
    expect(b.ok).toBe(true);
    const c = validateCodFeePolicyInput({
      codFeeMode: 'percentage_plus_fixed',
      codFeePct: 0.01,
      codFeeFixed: 2,
    });
    expect(c.ok).toBe(true);
  });

  it('rejects percentage_plus_fixed with neither pct nor fixed', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'percentage_plus_fixed' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/يتطلب/);
    }
  });

  it('accepts `none` mode without any value', () => {
    const result = validateCodFeePolicyInput({ codFeeMode: 'none' });
    expect(result.ok).toBe(true);
  });

  it('exposes MAX_COD_FEE_PCT = 0.5 as the source of truth', () => {
    expect(MAX_COD_FEE_PCT).toBe(0.5);
  });

  it('accepts numeric strings for pct/fixed (parses them)', () => {
    const result = validateCodFeePolicyInput({
      codFeeMode: 'percentage',
      codFeePct: '0.025',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.policy.pct).toBe(0.025);
    }
  });
});
