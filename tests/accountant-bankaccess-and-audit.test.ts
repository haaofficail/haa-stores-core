import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAdminPermissionsForRole } from '@haa/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const detail = read('apps/api/src/routes/admin/accountant-detail.ts');
const detailService = read('apps/api/src/services/accountant-detail.ts');
const ledger = read('packages/wallet-core/src/ledger.ts');

/** mirror of requireAnyAdminPermission's allow logic. */
const canAny = (granted: string[], required: string[]) =>
  granted.includes('admin:*') || required.some((p) => granted.includes(p));

describe('accountant can read/verify bank accounts WITHOUT kyc.*', () => {
  it('accountant role holds the finance bank-account permissions, not kyc.*', () => {
    const perms = getAdminPermissionsForRole('accountant');
    expect(perms).toContain('merchant.bank_accounts.view');
    expect(perms).toContain('merchant.bank_accounts.verify_for_payout');
    expect(perms).not.toContain('kyc.read');
    expect(perms).not.toContain('kyc.review');
  });

  it('the bank-account list route accepts kyc.read OR merchant.bank_accounts.view', () => {
    const line = adminIndex.split('\n').find((l) => l.includes("'/kyc/bank-accounts'")) ?? '';
    expect(line).toMatch(/requireAnyAdminPermission\('kyc\.read',\s*'merchant\.bank_accounts\.view'\)/);
  });

  it('the bank-account review route accepts kyc.review OR merchant.bank_accounts.verify_for_payout', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/kyc/bank-accounts/:id/review')) ?? '';
    expect(line).toMatch(/requireAnyAdminPermission\('kyc\.review',\s*'merchant\.bank_accounts\.verify_for_payout'\)/);
  });

  it('requireAnyAdminPermission grants on any held key or admin:*, denies otherwise', () => {
    const acc = getAdminPermissionsForRole('accountant');
    const sup = getAdminPermissionsForRole('super_admin');
    expect(canAny(acc, ['kyc.read', 'merchant.bank_accounts.view'])).toBe(true); // accountant via finance key
    expect(canAny(sup, ['kyc.read', 'merchant.bank_accounts.view'])).toBe(true); // super_admin via wildcard
    expect(canAny(acc, ['kyc.read', 'kyc.review'])).toBe(false); // no general KYC for accountant
  });

  it('general KYC route stays kyc.read only (accountant cannot reach it)', () => {
    const line = adminIndex.split('\n').find((l) => /adminRouter\.get\('\/kyc',/.test(l)) ?? '';
    expect(line).toMatch(/requireAdminPermission\('kyc\.read'\)/);
  });
});

describe('accountant settlement detail route', () => {
  it('is registered and guarded by the finance view permission', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('settlements/:payoutId/accountant-detail')) ?? '';
    expect(line).toMatch(/\/settlements\/:payoutId\/accountant-detail/);
    expect(line).toContain('requireAdminAuth()');
    expect(line).toContain("requireAdminPermission('wallet.payout.view_all')");
  });

  it('selects only masked bank columns — never the full iban', () => {
    expect(detail).toMatch(/getAccountantSettlementDetailReadModel/);
    expect(detailService).toMatch(/ibanLast4/);
    expect(detailService).not.toMatch(/s\.merchantBankAccounts\.iban\b/);
  });

  it('returns proof metadata without the file key / URL', () => {
    expect(detailService).toMatch(/sha256/);
    // must not SELECT the file key column (the comment may mention it by name)
    expect(detailService).not.toMatch(/proofFileKey:/);
    expect(detailService).not.toMatch(/payoutTransferProofs\.proofFileKey/);
  });
});

describe('audit completeness', () => {
  it('transfer transitions record the settlement currency in metadata', () => {
    const start = ledger.indexOf('private async transitionPayout');
    const body = ledger.slice(start, ledger.indexOf('private async transitionAnyPayout'));
    expect(body).toMatch(/metadata:\s*\{\s*currency:\s*payout\.currency\s*\}/);
  });

  it('receipt-upload audit metadata carries the full transfer set', () => {
    const start = ledger.indexOf('async uploadTransferProof(');
    const body = ledger.slice(start, ledger.indexOf('private async hasTransferProof'));
    for (const field of ['receiptId', 'sha256', 'fileMimeType', 'bankReference', 'bankName', 'transferDate', 'transferredAmount', 'currency', 'amountMatched']) {
      expect(body, `audit must include ${field}`).toMatch(new RegExp(field));
    }
  });
});
