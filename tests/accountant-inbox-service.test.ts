import { describe, expect, it } from 'vitest';
import { buildAccountantInbox } from '../apps/api/src/services/accountant-inbox.js';

/**
 * Batch 3 — Accountant Settlement Inbox (READ-ONLY).
 *
 * `buildAccountantInbox` is a pure segmentation+masking function: given payout
 * rows, per-store bank-account summaries (NEVER the full IBAN) and store names,
 * it splits settlements into `ready` (eligible for the accountant to process
 * later) and `exceptions` (not processable, each with a clear reason).
 *
 * It must NEVER expose a full IBAN — only the last 4 digits — and must not
 * mutate or process anything (no transfer logic; that is Batch 4+).
 */

const THRESHOLD = 10000;

function payout(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    storeId: 100,
    amount: '500.00',
    currency: 'SAR',
    status: 'requested',
    reference: 'PO-0001',
    bankAccountId: 9,
    requestedAt: new Date('2026-06-01T00:00:00Z'),
    failureReason: null,
    rejectionReason: null,
    metadata: null,
    ...over,
  };
}

const verifiedBank = { 100: { status: 'verified', ibanLast4: '1234' } };
const storeNames = { 100: 'متجر التجربة' };

function build(payouts: ReturnType<typeof payout>[], banks = verifiedBank) {
  return buildAccountantInbox({
    payouts,
    banksByStoreId: banks,
    storeNamesById: storeNames,
    secondApprovalThresholdSar: THRESHOLD,
  });
}

describe('buildAccountantInbox — ready vs exceptions', () => {
  it('puts an actionable payout with a verified bank in `ready` (not exceptions)', () => {
    const { ready, exceptions } = build([payout({ status: 'requested' })]);
    expect(ready).toHaveLength(1);
    expect(exceptions).toHaveLength(0);
    expect(ready[0].settlementId).toBe(1);
    expect(ready[0].merchantName).toBe('متجر التجربة');
    expect(ready[0].netAmount).toBe('500.00');
    expect(ready[0].bankAccountStatus).toBe('verified');
  });

  it('routes a terminal-failure payout to `exceptions` with its stored reason', () => {
    const { ready, exceptions } = build([
      payout({ id: 2, status: 'failed', failureReason: 'تعذّر التحويل البنكي' }),
    ]);
    expect(ready).toHaveLength(0);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].exceptionReason).toBe('تعذّر التحويل البنكي');
  });

  it('routes an actionable payout with an unverified bank to `exceptions` with a bank reason', () => {
    const { ready, exceptions } = build(
      [payout({ id: 3, status: 'requested' })],
      { 100: { status: 'submitted', ibanLast4: '1234' } },
    );
    expect(ready).toHaveLength(0);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].exceptionReason).toMatch(/بنك|موثّق|verified/i);
  });

  it('excludes completed/in-progress states (transfer_verified) from both lists', () => {
    const { ready, exceptions } = build([payout({ id: 4, status: 'transfer_verified' })]);
    expect(ready).toHaveLength(0);
    expect(exceptions).toHaveLength(0);
  });
});

describe('buildAccountantInbox — second approval flag', () => {
  it('flags needsSecondApproval=false below threshold', () => {
    const { ready } = build([payout({ amount: '9999.99' })]);
    expect(ready[0].needsSecondApproval).toBe(false);
  });

  it('flags needsSecondApproval=true at/above threshold', () => {
    const { ready } = build([payout({ amount: '10000.00' })]);
    expect(ready[0].needsSecondApproval).toBe(true);
  });
});

describe('buildAccountantInbox — IBAN never exposed in full', () => {
  it('exposes only ibanLast4 and never a full `iban` field', () => {
    const { ready } = build([payout()]);
    const item = ready[0] as Record<string, unknown>;
    expect(item.ibanLast4).toBe('1234');
    expect(String(item.ibanLast4).length).toBeLessThanOrEqual(4);
    expect(item).not.toHaveProperty('iban');
    // the entire serialized row must not contain a full-length IBAN
    expect(JSON.stringify(item)).not.toMatch(/[A-Z]{2}\d{20,}/);
  });
});

describe('buildAccountantInbox — derived fields from metadata', () => {
  it('reads period / ordersCount / dueDate from metadata when present, null otherwise', () => {
    const withMeta = build([
      payout({ id: 5, metadata: { period: '2026-05', ordersCount: 12, dueDate: '2026-06-05' } }),
    ]);
    expect(withMeta.ready[0].period).toBe('2026-05');
    expect(withMeta.ready[0].ordersCount).toBe(12);
    expect(withMeta.ready[0].dueDate).toBe('2026-06-05');

    const without = build([payout({ id: 6 })]);
    expect(without.ready[0].period).toBeNull();
    expect(without.ready[0].ordersCount).toBeNull();
    expect(without.ready[0].dueDate).toBeNull();
  });
});
