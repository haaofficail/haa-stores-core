import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { maskObject } from '@haa/shared';

const auditServiceSource = readFileSync(
  new URL('../packages/integration-core/src/audit.ts', import.meta.url),
  'utf-8',
);

describe('maskObject audit PII coverage', () => {
  it('masks compound customer and beneficiary PII keys', () => {
    const masked = maskObject({
      customerEmail: 'buyer@example.com',
      customerPhone: '+966500000000',
      customerName: 'عميل الاختبار',
      beneficiaryName: 'مستفيد الاختبار',
      shippingAddress: 'Riyadh, King Fahd Road',
      publicStatus: 'approved',
    });

    expect(masked.customerEmail).not.toBe('buyer@example.com');
    expect(masked.customerEmail).toContain('@example.com');
    expect(masked.customerPhone).not.toBe('+966500000000');
    expect(masked.customerPhone).toMatch(/0000$/);
    expect(masked.customerName).toBe('***MASKED***');
    expect(masked.beneficiaryName).toBe('***MASKED***');
    expect(masked.shippingAddress).toBe('***MASKED***');
    expect(masked.publicStatus).toBe('approved');
  });

  it('partially masks legal and financial identifiers with common key variants', () => {
    const masked = maskObject({
      accountNumber: '1234567890123456',
      bank_account: '9876543210987654',
      beneficiaryIbanMasked: 'SA12345678901234567890',
      commercial_registration: '1010123456',
      nationalId: '1234567890',
      taxNumber: '300123456700003',
    });

    expect(masked.accountNumber).toBe('************3456');
    expect(masked.bank_account).toBe('************7654');
    expect(masked.beneficiaryIbanMasked).toBe('******************7890');
    expect(masked.commercial_registration).toBe('******3456');
    expect(masked.nationalId).toBe('******7890');
    expect(masked.taxNumber).toBe('***********0003');
  });

  it('fully masks secret and card variants inside nested structures', () => {
    const masked = maskObject({
      provider: {
        apiSecret: 'sk_live_secret',
        privateKeyPem: '-----BEGIN PRIVATE KEY-----',
        cardNumber: '4111111111111111',
      },
      events: [
        { authorizationHeader: 'Bearer token-value' },
        { oneTimePassword: '123456' },
      ],
    });

    expect(masked.provider.apiSecret).toBe('***MASKED***');
    expect(masked.provider.privateKeyPem).toBe('***MASKED***');
    expect(masked.provider.cardNumber).toBe('***MASKED***');
    expect(masked.events[0].authorizationHeader).toBe('***MASKED***');
    expect(masked.events[1].oneTimePassword).toBe('***MASKED***');
  });

  it('keeps non-sensitive audit metadata useful', () => {
    const masked = maskObject({
      orderNumber: 'HAA-1000',
      amount: 125.5,
      statusReason: 'merchant requested suspension',
      marketplaceFeatured: true,
    });

    expect(masked).toEqual({
      orderNumber: 'HAA-1000',
      amount: 125.5,
      statusReason: 'merchant requested suspension',
      marketplaceFeatured: true,
    });
  });

  it('AuditLogService records oldValue and newValue through shared maskObject', () => {
    expect(auditServiceSource).toContain("import { maskIP, maskObject } from '@haa/shared'");
    expect(auditServiceSource).toContain('oldValue: input.oldValue ? maskObject(input.oldValue) : null');
    expect(auditServiceSource).toContain('newValue: input.newValue ? maskObject(input.newValue) : null');
  });
});
