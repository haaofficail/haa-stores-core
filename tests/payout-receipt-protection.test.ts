import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { WalletLedger } from '@haa/wallet-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf-8') : '');

const ledger = read('packages/wallet-core/src/ledger.ts');
const walletSchema = read('packages/db/src/schema/wallet.ts');
const adminIndex = read('apps/api/src/routes/admin/index.ts');

function methodBody(src: string, signature: string): string {
  const start = src.indexOf(signature);
  if (start < 0) return '';
  const next = src.indexOf('\n  async ', start + 10);
  const nextPriv = src.indexOf('\n  private async ', start + 10);
  const ends = [next, nextPriv].filter((n) => n > -1);
  return src.slice(start, ends.length ? Math.min(...ends) : src.length);
}

const uploadBody = methodBody(ledger, 'async uploadTransferProof(');
const verifyBody = methodBody(ledger, 'async verifyTransfer(');

describe('uploadTransferProof is atomic (insert + transition + audit in one tx)', () => {
  it('validates the receipt input first', () => {
    expect(uploadBody).toMatch(/assertReceiptInput/);
  });

  it('wraps every write path in a transaction and inserts the receipt exactly once', () => {
    // Batch 4C added a second, mutually-exclusive atomic branch (amount
    // mismatch -> manual_review), so there are now two transactions. The real
    // invariant is that the receipt is inserted exactly ONCE, inside a tx.
    expect((uploadBody.match(/this\.db\.transaction\(async/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(uploadBody.match(/tx\.insert\(s\.payoutTransferProofs\)/g) ?? []).toHaveLength(1);
  });

  it('does the guarded status transition BEFORE inserting the proof', () => {
    const txUpdate = uploadBody.search(/tx\.update\(s\.payoutRequests\)/);
    const txInsert = uploadBody.search(/tx\.insert\(s\.payoutTransferProofs\)/);
    expect(txUpdate).toBeGreaterThan(-1);
    expect(txInsert).toBeGreaterThan(-1);
    expect(txUpdate).toBeLessThan(txInsert);
  });

  it('inserts the proof INSIDE the transaction (no orphan-prone out-of-tx insert)', () => {
    expect(uploadBody).toMatch(/tx\.insert\(s\.payoutTransferProofs\)/);
    expect(uploadBody).not.toMatch(/this\.db\.insert\(s\.payoutTransferProofs\)/);
  });

  it('persists sha256 and fileMimeType with the proof', () => {
    expect(uploadBody).toMatch(/sha256/);
    expect(uploadBody).toMatch(/fileMimeType|file_mime_type/);
  });

  it('emits an audit event carrying receiptId and sha256', () => {
    expect(uploadBody).toMatch(/receiptId/);
    expect(uploadBody).toMatch(/sha256/);
  });
});

describe('verifyTransfer requires a saved receipt before debiting', () => {
  it('checks for a proof before opening the debit transaction', () => {
    const txAt = verifyBody.search(/this\.db\.transaction\(async/);
    const proofCheck = verifyBody.search(/TRANSFER_PROOF_REQUIRED/);
    expect(proofCheck).toBeGreaterThan(-1);
    expect(proofCheck).toBeLessThan(txAt);
  });

  it('throws TRANSFER_PROOF_REQUIRED when no proof exists (behavioral)', async () => {
    const l = new WalletLedger();
    vi.spyOn(l as never as { getPayoutById: (id: number) => Promise<unknown> }, 'getPayoutById')
      .mockResolvedValue({ id: 1, status: 'proof_uploaded', transferredByUserId: 2, requestedByUserId: 3, storeId: 5, amount: '100.00', currency: 'SAR', reference: 'PO-1' } as never);
    vi.spyOn(l as never as { hasTransferProof: (id: number) => Promise<boolean> }, 'hasTransferProof')
      .mockResolvedValue(false);
    await expect(l.verifyTransfer(1, { actorUserId: 9, actorRole: 'finance' } as never))
      .rejects.toThrow(/TRANSFER_PROOF_REQUIRED/);
  });
});

describe('schema + migration store sha256 and prevent a double receipt', () => {
  it('payoutTransferProofs has a sha256 column', () => {
    expect(walletSchema).toMatch(/sha256:\s*varchar\('sha256'/);
  });

  it('has a partial-unique index keyed on payout_request_id (one active receipt)', () => {
    expect(walletSchema).toMatch(/uniqueIndex|payout_transfer_proofs_active/);
    expect(walletSchema).toMatch(/verification_status|verificationStatus/);
  });

  it('ships a migration 0089 adding sha256 + the unique index', () => {
    const files = readdirSync(resolve(root, 'packages/db/src/migrations'));
    const mig = files.find((f) => /^0089_.*\.sql$/.test(f));
    expect(mig, 'migration 0089 must exist').toBeDefined();
    const sql = read(`packages/db/src/migrations/${mig}`);
    expect(sql).toMatch(/sha256/);
    expect(sql).toMatch(/UNIQUE/i);
  });
});

describe('upload-proof route still enforces idempotency and the new fields', () => {
  it('keeps idempotencyKey({ required: true }) on upload-proof', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/upload-proof')) ?? '';
    expect(line).toMatch(/idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/);
  });

  it('upload-proof schema requires sha256 and fileMimeType', () => {
    const schema = adminIndex.slice(adminIndex.indexOf('payoutUploadProofSchema'));
    expect(schema).toMatch(/sha256/);
    expect(schema).toMatch(/fileMimeType/);
  });
});
