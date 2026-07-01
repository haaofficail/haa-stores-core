import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  formatMaskedIban,
  hasProfileNationalId,
  isBankAccountReady,
  normalizeBankAccountSummary,
  normalizeComplianceProfile,
  toProfileUpdatePayload,
  validateSaudiIban,
} from '../apps/merchant-dashboard/src/lib/complianceModel';

describe('merchant compliance KYC/profile contract', () => {
  it('normalizes canonical API KYC fields into the dashboard form', () => {
    const form = normalizeComplianceProfile({
      businessType: 'company',
      legalName: 'Haa Stores LLC',
      commercialName: 'Haa',
      commercialRegistrationNumber: '1010123456',
      freelanceDocumentNumber: 'FL-123',
      vatNumber: '300000000000003',
      city: 'Riyadh',
      address: 'King Fahd Road',
      hasNationalIdOrIqama: true,
      nationalIdOrIqamaLast4: '6789',
    });

    expect(form.crNumber).toBe('1010123456');
    expect(form.freelanceDocNumber).toBe('FL-123');
    expect(form.hasNationalIdOnFile).toBe(true);
    expect(form.nationalIdLast4).toBe('6789');
    expect(hasProfileNationalId(form)).toBe(true);
  });

  it('keeps legacy field names backward-compatible while saving canonical names', () => {
    const form = normalizeComplianceProfile({
      businessType: 'individual',
      legalName: 'Merchant',
      crNumber: '1010999999',
      nationalId: '1234567890',
      freelanceDocNumber: 'FREE-42',
      city: 'Jeddah',
      address: 'Corniche',
    });

    const payload = toProfileUpdatePayload(form);

    expect(payload).toMatchObject({
      commercialRegistrationNumber: '1010999999',
      nationalIdOrIqama: '1234567890',
      freelanceDocumentNumber: 'FREE-42',
    });
    expect(payload).not.toHaveProperty('crNumber');
    expect(payload).not.toHaveProperty('nationalId');
    expect(payload).not.toHaveProperty('freelanceDocNumber');
  });

  it('accepts legacy aliases at the API route and returns safe national ID metadata', async () => {
    const routePath = path.resolve(__dirname, '..', 'apps/api/src/routes/compliance.ts');
    const source = await fs.readFile(routePath, 'utf-8');

    expect(source).toContain('nationalId: z.string().max(20).optional()');
    expect(source).toContain('crNumber: z.string().max(50).optional()');
    expect(source).toContain('freelanceDocNumber: z.string().max(50).optional()');
    expect(source).toContain('hasNationalIdOrIqama');
    expect(source).toContain('nationalIdOrIqamaLast4');
    expect(source).toContain('delete safe.nationalIdOrIqama');
  });
});

describe('merchant compliance bank readiness contract', () => {
  it('uses safe bank summaries returned by the API instead of a full IBAN', () => {
    const account = normalizeBankAccountSummary([
      { id: 1, bankName: 'SNB', accountHolderName: 'Merchant', ibanLast4: '7519', status: 'submitted', isDefault: true },
    ]);

    expect(account).toMatchObject({ bankName: 'SNB', ibanLast4: '7519', status: 'submitted' });
    expect(account as Record<string, unknown>).not.toHaveProperty('iban');
    expect(isBankAccountReady(account, '')).toBe(true);
    expect(formatMaskedIban(account?.ibanLast4)).toBe('SA **** **** **** **** 7519');
  });

  it('still validates a newly typed Saudi IBAN before save', () => {
    expect(validateSaudiIban('SA0380000000608010167519')).toBe(true);
    expect(isBankAccountReady(null, 'SA0380000000608010167519')).toBe(true);
    expect(validateSaudiIban('SA0000000000000000000000')).toBe(false);
  });
});
