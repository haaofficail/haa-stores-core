import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf-8') : '');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const inboxRoute = read('apps/api/src/routes/admin/accountant-inbox.ts');
const inboxService = read('apps/api/src/services/accountant-inbox.ts');

/**
 * Batch 3 — Accountant inbox API contract.
 *
 * The endpoint must be permission-guarded server-side (not UI-only) and must
 * never select / return the full IBAN — only the masked last 4.
 */
describe('accountant inbox route is permission-guarded', () => {
  it('registers GET /settlements/accountant-inbox', () => {
    expect(adminIndex).toMatch(/['"]\/settlements\/accountant-inbox['"]/);
  });

  it('guards the inbox route with requireAdminAuth + wallet.payout.view_all', () => {
    const line = adminIndex
      .split('\n')
      .find((l) => l.includes('/settlements/accountant-inbox')) ?? '';
    expect(line).toContain('requireAdminAuth()');
    expect(line).toContain("requireAdminPermission('wallet.payout.view_all')");
  });
});

describe('accountant inbox route never exposes a full IBAN', () => {
  it('the handler file exists and builds the inbox via the shared service', () => {
    expect(inboxRoute).not.toBe('');
    expect(inboxRoute).toMatch(/getAccountantInboxReadModel/);
    expect(inboxService).toMatch(/buildAccountantInbox/);
  });

  it('selects only ibanLast4 — never the full `iban` column', () => {
    // The masked column is allowed; the full column is banned.
    expect(inboxService).toMatch(/ibanLast4/);
    expect(inboxService).not.toMatch(/merchantBankAccounts\.iban\b/);
  });
});
