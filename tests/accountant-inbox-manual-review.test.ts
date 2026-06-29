import { describe, expect, it } from 'vitest';
import { buildAccountantInbox } from '../apps/api/src/services/accountant-inbox.js';

/**
 * Batch 4D — a manual_review settlement (e.g. transfer amount/currency
 * mismatch from 4C) must appear in the accountant's EXCEPTIONS list with a
 * clear reason, and must NEVER appear in the ready-to-transfer queue.
 */

function inboxFor(status: string) {
  return buildAccountantInbox({
    payouts: [{ id: 7, storeId: 100, amount: '100.00', currency: 'SAR', status, reference: 'PO-7' }],
    banksByStoreId: { 100: { status: 'verified', ibanLast4: '1234' } },
    storeNamesById: { 100: 'متجر' },
    secondApprovalThresholdSar: 10000,
  });
}

describe('manual_review in the accountant inbox', () => {
  it('appears in exceptions with a clear reason', () => {
    const { ready, exceptions } = inboxFor('manual_review');
    expect(ready).toHaveLength(0);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].exceptionReason).toMatch(/مراجعة يدوية|اختلاف/);
  });

  it('never appears in the ready-to-transfer queue', () => {
    const { ready } = inboxFor('manual_review');
    expect(ready).toHaveLength(0);
  });

  it('never exposes a full IBAN (only last 4)', () => {
    const { exceptions } = inboxFor('manual_review');
    const item = exceptions[0] as Record<string, unknown>;
    expect(item).not.toHaveProperty('iban');
    expect(item.ibanLast4).toBe('1234');
  });
});
