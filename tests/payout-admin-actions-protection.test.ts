import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const ledger = read('packages/wallet-core/src/ledger.ts');

/**
 * Batch 4A — double-spend protection for the accountant's manual-transfer
 * actions. These guards must live in the BACKEND, not the UI.
 */

const MUTATING_PAYOUT_ROUTES = [
  '/settlements/manual-payouts/:payoutId/mark-transfer-pending',
  '/settlements/manual-payouts/:payoutId/mark-transferred',
  '/settlements/manual-payouts/:payoutId/upload-proof',
  '/settlements/manual-payouts/:payoutId/verify-transfer',
];

describe('idempotency is enforced on state-changing payout actions', () => {
  it('imports the idempotencyKey middleware in the admin router', () => {
    expect(adminIndex).toMatch(/idempotencyKey/);
    expect(adminIndex).toMatch(/from\s+['"][^'"]*middleware\/idempotency-key\.js['"]/);
  });

  it.each(MUTATING_PAYOUT_ROUTES)('requires Idempotency-Key on %s', (path) => {
    const line = adminIndex.split('\n').find((l) => l.includes(`'${path}'`)) ?? '';
    expect(line, `${path} must be registered`).not.toBe('');
    expect(line, `${path} must enforce idempotencyKey({ required: true })`).toMatch(
      /idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/,
    );
  });
});

describe('verifyTransfer debits the ledger atomically (inside the transaction)', () => {
  // Extract the verifyTransfer method body.
  const start = ledger.indexOf('async verifyTransfer(');
  const body = ledger.slice(start, ledger.indexOf('\n  async ', start + 10));

  it('records the payout debit inside the same transaction (no out-of-tx recordEntry)', () => {
    expect(start).toBeGreaterThan(-1);
    // the debit must reference the in-transaction helper, not the standalone
    // recordEntry (which would open a SECOND transaction).
    expect(body).toMatch(/recordEntryInTx/);
    // the old anti-pattern — closing the tx then calling this.recordEntry —
    // must be gone.
    expect(body).not.toMatch(/\}\);\s*await this\.recordEntry\(/);
  });

  it('wraps each verify path atomically and debits in exactly one place', () => {
    // Batch 5 added a second, mutually-exclusive atomic branch (large amount ->
    // awaiting_second_approval, NO debit). So verifyTransfer now has two
    // transactions; the invariant is that the ledger debit happens in EXACTLY
    // ONE place (the finalize path) — the awaiting path never debits.
    const txCount = (body.match(/this\.db\.transaction\(async/g) ?? []).length;
    expect(txCount).toBeGreaterThanOrEqual(1);
    expect((body.match(/recordEntryInTx/g) ?? []).length).toBe(1);
  });
});

describe('payout debit is idempotent at the DB level (no double-charge)', () => {
  it('resolveIdempotentSpec covers payout_debit + payout reference', () => {
    expect(ledger).toMatch(/payout_debit['"]?\s*&&\s*rt === 'payout'|type = 'payout_debit' AND reference_type = 'payout'/);
  });
});
