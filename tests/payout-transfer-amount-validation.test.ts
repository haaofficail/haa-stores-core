import { describe, expect, it } from 'vitest';
import { assertTransferData, evaluateTransferAmount } from '@haa/wallet-core';

/**
 * Batch 4C — bank transfer data + amount/currency matching (pure).
 *
 * The transferred amount must EXACTLY match the settlement net amount
 * (decimal-safe, no silent rounding) and the currency must match. Required
 * fields are validated with stable error codes.
 */

const NOW = new Date('2026-06-29T00:00:00Z').getTime();
const validData = {
  bankName: 'Al Rajhi Bank',
  transferredAt: new Date('2026-06-28T00:00:00Z'),
  transferredAmount: '100.00',
  currency: 'SAR',
};

describe('assertTransferData', () => {
  it('accepts complete, valid transfer data', () => {
    expect(() => assertTransferData(validData, NOW)).not.toThrow();
  });

  it('requires a bank name', () => {
    expect(() => assertTransferData({ ...validData, bankName: '' }, NOW)).toThrow(/TRANSFER_BANK_NAME_REQUIRED/);
  });

  it('requires a valid transfer date', () => {
    expect(() => assertTransferData({ ...validData, transferredAt: undefined }, NOW)).toThrow(/TRANSFER_DATE_INVALID/);
    expect(() => assertTransferData({ ...validData, transferredAt: new Date('invalid') }, NOW)).toThrow(/TRANSFER_DATE_INVALID/);
  });

  it('rejects a transfer date too far in the future', () => {
    const farFuture = new Date(NOW + 3 * 24 * 60 * 60 * 1000);
    expect(() => assertTransferData({ ...validData, transferredAt: farFuture }, NOW)).toThrow(/TRANSFER_DATE_INVALID/);
  });

  it('requires a positive transferred amount', () => {
    expect(() => assertTransferData({ ...validData, transferredAmount: undefined }, NOW)).toThrow(/TRANSFER_AMOUNT_INVALID/);
    expect(() => assertTransferData({ ...validData, transferredAmount: '0' }, NOW)).toThrow(/TRANSFER_AMOUNT_INVALID/);
    expect(() => assertTransferData({ ...validData, transferredAmount: '-5' }, NOW)).toThrow(/TRANSFER_AMOUNT_INVALID/);
  });

  it('requires a currency', () => {
    expect(() => assertTransferData({ ...validData, currency: '' }, NOW)).toThrow(/TRANSFER_CURRENCY_REQUIRED/);
  });
});

describe('evaluateTransferAmount', () => {
  it('matches equal amounts + currency (decimal-safe: 100 == 100.00)', () => {
    expect(evaluateTransferAmount('100.00', 'SAR', '100', 'SAR')).toEqual({ ok: true });
  });

  it('flags an amount mismatch (no silent difference)', () => {
    const r = evaluateTransferAmount('100.00', 'SAR', '100.01', 'SAR');
    expect(r.ok).toBe(false);
    expect((r as { code: string }).code).toBe('TRANSFER_AMOUNT_MISMATCH');
    expect((r as { reason: string }).reason).toMatch(/100\.00|100\.01/);
  });

  it('flags a currency mismatch', () => {
    const r = evaluateTransferAmount('100.00', 'SAR', '100.00', 'USD');
    expect(r.ok).toBe(false);
    expect((r as { code: string }).code).toBe('TRANSFER_CURRENCY_MISMATCH');
  });

  it('flags a non-positive transferred amount as invalid', () => {
    expect((evaluateTransferAmount('100.00', 'SAR', '0', 'SAR') as { code: string }).code).toBe('TRANSFER_AMOUNT_INVALID');
    expect((evaluateTransferAmount('100.00', 'SAR', '-1', 'SAR') as { code: string }).code).toBe('TRANSFER_AMOUNT_INVALID');
  });
});
