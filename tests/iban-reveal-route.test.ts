import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf-8') : '');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const handler = read('apps/api/src/routes/admin/iban-reveal.ts');
const revealService = read('apps/api/src/services/iban-reveal.ts');
const kycBank = read('apps/api/src/routes/admin/tenants-stores.ts');

/**
 * Batch 4D — IBAN reveal is permission-guarded, audited, and is the ONLY place
 * a full IBAN leaves the server. All list routes mask it.
 */
describe('reveal-iban route is guarded by the dedicated permission', () => {
  it('registers POST /settlements/:payoutId/reveal-iban', () => {
    expect(adminIndex).toMatch(/['"]\/settlements\/:payoutId\/reveal-iban['"]/);
  });

  it('guards it with requireAdminAuth + reveal_iban_for_payout + the action schema', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/reveal-iban')) ?? '';
    expect(line).toContain('requireAdminAuth()');
    expect(line).toContain("requireAdminPermission('merchant.bank_accounts.reveal_iban_for_payout')");
    expect(line).toMatch(/zValidator\('json',\s*ibanRevealSchema\)/);
  });
});

describe('reveal handler returns the full IBAN only here, and audits without it', () => {
  it('validates reveal is allowed for this payout + bank account', () => {
    expect(handler).toMatch(/revealPayoutIban/);
    expect(revealService).toMatch(/assertRevealAllowed/);
  });

  it('returns the full iban in the response (this route only)', () => {
    const response = revealService.slice(revealService.indexOf('ok: true'));
    expect(response).toMatch(/iban:\s*bank!?\.iban\b/);
  });

  it('distinguishes view vs copy as different audit events', () => {
    expect(revealService).toMatch(/bank_account\.iban_revealed_for_payout/);
    expect(revealService).toMatch(/bank_account\.iban_copied_for_payout/);
  });

  it('writes an audit record carrying only ibanLast4 — never the full iban', () => {
    // audit call sits between the LAST `return c.json` (success) and the
    // `.record({` invocation; use lastIndexOf so the earlier error-branch
    // `return c.json` doesn't collapse the slice.
    const auditBlock = revealService.slice(revealService.indexOf('.record({'), revealService.lastIndexOf('return {'));
    expect(auditBlock).toMatch(/ibanLast4/);
    expect(auditBlock).not.toMatch(/iban:\s*bank!?\.iban\b/);
  });
});

describe('list routes never return the full IBAN', () => {
  it('/admin/kyc/bank-accounts masks the IBAN server-side (last 4 / maskedIban)', () => {
    const list = kycBank.slice(kycBank.indexOf('export const kycBankRoutes'));
    const listFn = list.slice(0, list.indexOf('review:'));
    expect(listFn).toMatch(/ibanLast4/);
    expect(listFn).toMatch(/maskedIban/);
    // must NOT select every column (which would include the full iban)
    expect(listFn).not.toMatch(/db\.select\(\)\.from\(s\.merchantBankAccounts\)/);
  });
});
