import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(projectRoot, path), 'utf-8');
}

describe('Admin IBAN reveal typing contract', () => {
  it('keeps the dedicated IBAN reveal permission typed and cataloged', () => {
    const ordersTypes = read('packages/shared/src/types/orders.ts');
    const permissions = read('packages/shared/src/permissions.ts');
    const adminIndex = read('apps/api/src/routes/admin/index.ts');

    expect(ordersTypes).toContain("| 'merchant.bank_accounts.reveal_iban_for_payout'");
    expect(permissions).toContain("key: 'merchant.bank_accounts.reveal_iban_for_payout'");
    expect(permissions).toContain("'merchant.bank_accounts.reveal_iban_for_payout'");
    expect(adminIndex).toContain("requireAdminPermission('merchant.bank_accounts.reveal_iban_for_payout')");
  });

  it('keeps IBAN reveal/copy actions inside the typed audit vocabulary', () => {
    const ordersTypes = read('packages/shared/src/types/orders.ts');
    const auditTypes = read('packages/shared/src/types/audit.ts');
    const revealService = read('apps/api/src/services/iban-reveal.ts');

    expect(ordersTypes).toContain("| 'bank_account.iban_revealed_for_payout'");
    expect(ordersTypes).toContain("| 'bank_account.iban_copied_for_payout'");
    expect(auditTypes).toContain("'bank_account.iban_revealed_for_payout': 'كشف IBAN لحوالة التسوية'");
    expect(auditTypes).toContain("'bank_account.iban_copied_for_payout': 'نسخ IBAN لحوالة التسوية'");
    expect(revealService).toContain("'bank_account.iban_copied_for_payout'");
    expect(revealService).toContain("'bank_account.iban_revealed_for_payout'");
  });

  it('guards against full IBAN being stored in the audit payload', () => {
    const revealService = read('apps/api/src/services/iban-reveal.ts');
    const auditBlockStart = revealService.indexOf('await new AuditLogService().record');
    const responseBlockStart = revealService.indexOf('return {', auditBlockStart);

    expect(auditBlockStart).toBeGreaterThanOrEqual(0);
    expect(responseBlockStart).toBeGreaterThan(auditBlockStart);
    const auditBlock = revealService.slice(auditBlockStart, responseBlockStart);
    expect(auditBlock).toContain('ibanLast4: bank!.ibanLast4');
    expect(auditBlock).not.toContain('iban: bank!.iban');
  });
});
