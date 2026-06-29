import { describe, expect, it } from 'vitest';
import { buildAccountantSettlementDetail } from '../apps/api/src/services/accountant-detail.js';

/**
 * Batch 4E — accountant settlement detail (read model).
 *
 * Assembles everything the accountant needs to process a transfer WITHOUT ever
 * exposing a full IBAN, a public receipt URL, KYC data or secrets.
 */

const payout = {
  id: 1, storeId: 5, status: 'transferred', amount: '100.00', currency: 'SAR',
  reference: 'PO-1', bankAccountId: 9,
  metadata: { period: '2026-05', ordersCount: 12, dueDate: '2026-06-05' },
};
const bank = { bankName: 'Al Rajhi', accountHolderName: 'متجر', ibanLast4: '1234', status: 'verified' };
const proof = {
  id: 7, sha256: 'a'.repeat(64), fileMimeType: 'application/pdf', bankReference: 'BNK-1',
  bankName: 'Al Rajhi', transferredAt: new Date('2026-06-01'), amount: '100.00', currency: 'SAR',
  proofFileKey: 'stores/5/uploads/secret-key.pdf',
};
const events = [{ eventType: 'payout_marked_transferred', fromStatus: 'approved', toStatus: 'transferred', createdAt: new Date('2026-06-01'), actorRole: 'accountant', amount: '100.00' }];

const REVEALABLE = ['approved', 'transfer_pending', 'transferred', 'proof_uploaded'];

function build(over: Record<string, unknown> = {}) {
  return buildAccountantSettlementDetail({
    payout: { ...payout, ...over }, storeName: 'متجر التجربة', bank, proof, events,
    revealableStates: REVEALABLE,
  });
}

describe('buildAccountantSettlementDetail', () => {
  it('returns core settlement fields', () => {
    const d = build();
    expect(d.payoutId).toBe(1);
    expect(d.merchantName).toBe('متجر التجربة');
    expect(d.amount).toBe('100.00');
    expect(d.currency).toBe('SAR');
    expect(d.status).toBe('transferred');
    expect(d.period).toBe('2026-05');
    expect(d.ordersCount).toBe(12);
    expect(d.dueDate).toBe('2026-06-05');
  });

  it('returns the bank account masked (last 4 / maskedIban), never the full IBAN', () => {
    const d = build();
    expect(d.bankAccount?.ibanLast4).toBe('1234');
    expect(d.bankAccount?.maskedIban).toBe('****1234');
    expect(d.bankAccount?.verificationStatus).toBe('verified');
    expect(JSON.stringify(d)).not.toMatch(/[A-Z]{2}\d{20,}/);
    expect(d.bankAccount as Record<string, unknown>).not.toHaveProperty('iban');
  });

  it('returns transfer-proof metadata WITHOUT any file URL/key', () => {
    const d = build();
    expect(d.transferProof?.receiptId).toBe(7);
    expect(d.transferProof?.sha256).toBe(proof.sha256);
    expect(d.transferProof?.bankReference).toBe('BNK-1');
    const s = JSON.stringify(d.transferProof);
    expect(s).not.toMatch(/proofFileKey|secret-key|http/);
  });

  it('exposes an events timeline', () => {
    expect(build().events).toHaveLength(1);
  });

  it('canRevealIban is true for an operational payout with a bank account', () => {
    expect(build().canRevealIban).toBe(true);
  });

  it('canRevealIban is false for a non-operational state', () => {
    expect(build({ status: 'transfer_verified' }).canRevealIban).toBe(false);
  });

  it('canRevealIban is false when there is no bank account', () => {
    const d = buildAccountantSettlementDetail({ payout, storeName: 'x', bank: null, proof: null, events: [], revealableStates: REVEALABLE });
    expect(d.canRevealIban).toBe(false);
    expect(d.bankAccount).toBeNull();
    expect(d.transferProof).toBeNull();
  });
});
