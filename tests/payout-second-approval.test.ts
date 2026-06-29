import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WalletLedger } from '@haa/wallet-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ledgerSrc = readFileSync(resolve(__dirname, '../packages/wallet-core/src/ledger.ts'), 'utf-8');

function mockDb() {
  const whereResult = Object.assign(Promise.resolve([{ id: 1 }]), { returning: async () => [{ id: 1 }] });
  const valuesResult = Object.assign(Promise.resolve([{ id: 7 }]), { returning: async () => [{ id: 7 }] });
  const tx = {
    update: () => ({ set: () => ({ where: () => whereResult }) }),
    insert: () => ({ values: () => valuesResult }),
  };
  return {
    transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    insert: () => ({ values: () => valuesResult }),
  } as never;
}

function ledgerWith(payout: Record<string, unknown>) {
  const l = new WalletLedger();
  vi.spyOn(l as never as { getPayoutById: (id: number) => Promise<unknown> }, 'getPayoutById')
    .mockResolvedValue(payout as never);
  vi.spyOn(l as never as { hasTransferProof: (id: number) => Promise<boolean> }, 'hasTransferProof')
    .mockResolvedValue(true);
  const debit = vi.spyOn(l as never as { recordEntryInTx: (...a: unknown[]) => Promise<unknown> }, 'recordEntryInTx')
    .mockResolvedValue(undefined as never);
  Object.defineProperty(l, 'db', { value: mockDb() });
  return { l, debit };
}

const proofUploaded = (amount: string) => ({
  id: 1, status: 'proof_uploaded', transferredByUserId: 9, requestedByUserId: 3,
  storeId: 5, amount, currency: 'SAR', reference: 'PO-1',
});
const awaiting = (amount: string) => ({ ...proofUploaded(amount), status: 'awaiting_second_approval' });
const ctx = (id: number) => ({ actorUserId: id, actorRole: 'finance' } as never);

beforeEach(() => vi.restoreAllMocks());

describe('verifyTransfer routes large settlements to a second approval', () => {
  it('a small settlement is verified + debited immediately', async () => {
    const { l, debit } = ledgerWith(proofUploaded('500.00'));
    await l.verifyTransfer(1, ctx(7));
    expect(debit).toHaveBeenCalledTimes(1);
  });

  it('a large settlement is NOT debited (waits for second approval)', async () => {
    const { l, debit } = ledgerWith(proofUploaded('20000.00'));
    await l.verifyTransfer(1, ctx(7));
    expect(debit).not.toHaveBeenCalled();
  });
});

describe('secondApprovePayout enforces segregation of duties', () => {
  it('the receipt uploader (transfer actor) cannot second-approve', async () => {
    const { l, debit } = ledgerWith(awaiting('20000.00'));
    await expect(l.secondApprovePayout(1, ctx(9))) // 9 = transferredByUserId
      .rejects.toThrow(/SEGREGATION_OF_DUTIES_VIOLATION/);
    expect(debit).not.toHaveBeenCalled();
  });

  it('a different authorized user CAN second-approve and the debit runs once', async () => {
    const { l, debit } = ledgerWith(awaiting('20000.00'));
    await l.secondApprovePayout(1, ctx(7));
    expect(debit).toHaveBeenCalledTimes(1);
  });
});

describe('source contract', () => {
  it('PayoutStatus includes awaiting_second_approval', () => {
    expect(ledgerSrc).toMatch(/\|\s*'awaiting_second_approval'/);
  });

  it('verifyTransfer branches on the second-approval threshold', () => {
    const body = ledgerSrc.slice(ledgerSrc.indexOf('async verifyTransfer('), ledgerSrc.indexOf('\n  async cancelPayout'));
    expect(body).toMatch(/needsSecondApproval/);
    expect(body).toMatch(/awaiting_second_approval/);
    expect(body).toMatch(/settlement\.second_approval_required/);
  });

  it('secondApprovePayout: guarded transition + atomic debit + audit + segregation', () => {
    const start = ledgerSrc.indexOf('async secondApprovePayout(');
    expect(start).toBeGreaterThan(-1);
    const body = ledgerSrc.slice(start, ledgerSrc.indexOf('\n  private async', start));
    expect(body).toMatch(/SEGREGATION_OF_DUTIES_VIOLATION/);
    expect(body).toMatch(/eq\(s\.payoutRequests\.status,\s*'awaiting_second_approval'\)/);
    expect(body).toMatch(/recordEntryInTx/);
    expect(body).toMatch(/settlement\.second_approved/);
  });
});
