import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { WalletLedger } from '@haa/wallet-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const ledgerSrc = readFileSync(resolve(root, 'packages/wallet-core/src/ledger.ts'), 'utf-8');

function uploadBody() {
  const start = ledgerSrc.indexOf('async uploadTransferProof(');
  return ledgerSrc.slice(start, ledgerSrc.indexOf('\n  private async hasTransferProof'));
}

/** Mock db/tx supporting both `insert().values()` and `insert().values().returning()`. */
function mockDb() {
  const valuesResult = Object.assign(Promise.resolve([{ id: 7 }]), { returning: async () => [{ id: 7 }] });
  const tx = {
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: 1 }] }) }) }),
    insert: () => ({ values: () => valuesResult }),
  };
  return { transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } as never;
}

const SHA = 'a'.repeat(64);
function proof(over: Record<string, unknown> = {}) {
  return {
    proofFileKey: 'stores/5/uploads/r.pdf',
    bankReference: 'BNK-1',
    bankName: 'Al Rajhi',
    sha256: SHA,
    fileMimeType: 'application/pdf',
    beneficiaryIbanMasked: '****1234',
    transferredAt: new Date(Date.now() - 86400000),
    transferredAmount: '100.00',
    currency: 'SAR',
    ...over,
  };
}

function ledgerWithPayout() {
  const l = new WalletLedger();
  vi.spyOn(l as never as { getPayoutById: (id: number) => Promise<unknown> }, 'getPayoutById')
    .mockResolvedValue({ id: 1, status: 'transferred', transferredByUserId: 9, requestedByUserId: 3, storeId: 5, amount: '100.00', currency: 'SAR', reference: 'PO-1' } as never);
  Object.defineProperty(l, 'db', { value: mockDb() });
  return l;
}
const ctx = { actorUserId: 9, actorRole: 'finance' } as never;

describe('uploadTransferProof — amount/currency matching (source contract)', () => {
  const body = uploadBody();
  it('validates transfer data and evaluates the amount', () => {
    expect(body).toMatch(/assertTransferData/);
    expect(body).toMatch(/evaluateTransferAmount/);
  });
  it('parks a mismatch in manual_review and emits the blocked event', () => {
    expect(body).toMatch(/status:\s*'manual_review'/);
    expect(body).toMatch(/settlement\.archive_blocked_amount_mismatch/);
    expect(body).toMatch(/throw new Error\(amountCheck\.code\)/);
  });
  it('records amountMatched + bank reference on the matched path', () => {
    expect(body).toMatch(/amountMatched:\s*true/);
    expect(body).toMatch(/bankReference:\s*proof\.bankReference/);
  });
  it('PayoutStatus type includes manual_review', () => {
    expect(ledgerSrc).toMatch(/\|\s*'manual_review'/);
  });
});

describe('uploadTransferProof — amount/currency matching (behavioral)', () => {
  it('a matching amount proceeds (no throw)', async () => {
    const l = ledgerWithPayout();
    await expect(l.uploadTransferProof(1, proof() as never, ctx)).resolves.toBeDefined();
  });

  it('a mismatched amount throws TRANSFER_AMOUNT_MISMATCH (and never reaches verify/debit)', async () => {
    const l = ledgerWithPayout();
    await expect(l.uploadTransferProof(1, proof({ transferredAmount: '99.00' }) as never, ctx))
      .rejects.toThrow(/TRANSFER_AMOUNT_MISMATCH/);
  });

  it('a mismatched currency throws TRANSFER_CURRENCY_MISMATCH', async () => {
    const l = ledgerWithPayout();
    await expect(l.uploadTransferProof(1, proof({ currency: 'USD' }) as never, ctx))
      .rejects.toThrow(/TRANSFER_CURRENCY_MISMATCH/);
  });

  it('a zero/negative amount throws TRANSFER_AMOUNT_INVALID', async () => {
    const l = ledgerWithPayout();
    await expect(l.uploadTransferProof(1, proof({ transferredAmount: '0' }) as never, ctx))
      .rejects.toThrow(/TRANSFER_AMOUNT_INVALID/);
  });
});
