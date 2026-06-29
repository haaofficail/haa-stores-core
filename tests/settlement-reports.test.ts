import { describe, expect, it } from 'vitest';
import {
  RECONCILIATION_STATUSES,
  classifyReconciliation,
  isStuckSettlement,
  STUCK_STATES,
} from '../apps/api/src/services/settlement-reports.js';
import { getStuckAfterHours, DEFAULT_STUCK_AFTER_HOURS } from '@haa/wallet-core';

/**
 * Batch 6 — reconciliation classification + stuck detection (pure).
 */
const payout = (over: Record<string, unknown> = {}) => ({
  id: 1, storeId: 5, status: 'transfer_verified', amount: '100.00', currency: 'SAR', ...over,
});
const proof = (over: Record<string, unknown> = {}) => ({
  bankReference: 'BNK-1', amount: '100.00', currency: 'SAR', ...over,
});

describe('classifyReconciliation', () => {
  it('matched: verified + receipt + bank ref + amount/currency agree', () => {
    expect(classifyReconciliation(payout(), proof())).toBe('matched');
  });
  it('missing_receipt when there is no proof', () => {
    expect(classifyReconciliation(payout({ status: 'transferred' }), null)).toBe('missing_receipt');
  });
  it('missing_bank_reference when the proof has no bank reference', () => {
    expect(classifyReconciliation(payout(), proof({ bankReference: '  ' }))).toBe('missing_bank_reference');
  });
  it('amount_mismatch when proof amount differs', () => {
    expect(classifyReconciliation(payout(), proof({ amount: '99.00' }))).toBe('amount_mismatch');
  });
  it('currency_mismatch when proof currency differs', () => {
    expect(classifyReconciliation(payout(), proof({ currency: 'USD' }))).toBe('currency_mismatch');
  });
  it('pending_second_approval for awaiting_second_approval', () => {
    expect(classifyReconciliation(payout({ status: 'awaiting_second_approval' }), proof())).toBe('pending_second_approval');
  });
  it('manual_review for manual_review', () => {
    expect(classifyReconciliation(payout({ status: 'manual_review' }), null)).toBe('manual_review');
  });
  it('stuck_transfer_pending for transfer_pending', () => {
    expect(classifyReconciliation(payout({ status: 'transfer_pending' }), null)).toBe('stuck_transfer_pending');
  });
  it('every result is a known reconciliation status', () => {
    const r = classifyReconciliation(payout(), proof());
    expect(RECONCILIATION_STATUSES).toContain(r);
  });
});

describe('isStuckSettlement', () => {
  const now = new Date('2026-06-10T00:00:00Z').getTime();
  const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000);

  it('flags a transfer_pending older than the threshold', () => {
    expect(isStuckSettlement({ status: 'transfer_pending', updatedAt: hoursAgo(100) }, 48, now)).toBe(true);
  });
  it('does NOT flag a recent transfer_pending', () => {
    expect(isStuckSettlement({ status: 'transfer_pending', updatedAt: hoursAgo(2) }, 48, now)).toBe(false);
  });
  it('flags an old awaiting_second_approval', () => {
    expect(isStuckSettlement({ status: 'awaiting_second_approval', updatedAt: hoursAgo(100) }, 48, now)).toBe(true);
  });
  it('never flags a finalized settlement', () => {
    expect(isStuckSettlement({ status: 'transfer_verified', updatedAt: hoursAgo(1000) }, 48, now)).toBe(false);
  });
  it('STUCK_STATES covers the non-final in-progress states', () => {
    expect(STUCK_STATES).toEqual(expect.arrayContaining(['transfer_pending', 'transferred', 'proof_uploaded', 'manual_review', 'awaiting_second_approval']));
  });
});

describe('stuck-after-hours config', () => {
  it('defaults to a documented constant', () => {
    expect(DEFAULT_STUCK_AFTER_HOURS).toBeGreaterThan(0);
    expect(getStuckAfterHours()).toBe(DEFAULT_STUCK_AFTER_HOURS);
  });
});
