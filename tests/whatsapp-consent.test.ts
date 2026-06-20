import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const schema = readFileSync(new URL('../packages/db/src/schema/customers.ts', import.meta.url), 'utf-8');
const svc = readFileSync(new URL('../packages/commerce-core/src/whatsapp-campaigns.ts', import.meta.url), 'utf-8');
const migration = readFileSync(new URL('../packages/db/src/migrations/0069_whatsapp_consent.sql', import.meta.url), 'utf-8');

describe('WhatsApp marketing consent (QA WA1/WA3)', () => {
  it('customers schema has consent + opt-out columns (default no-consent)', () => {
    expect(schema).toContain("whatsapp_marketing_consent");
    expect(schema).toContain("whatsapp_opt_out");
    expect(schema).toContain('.default(false)');
  });
  it('migration adds the columns', () => {
    expect(migration).toContain('whatsapp_marketing_consent');
    expect(migration).toContain('whatsapp_opt_out');
  });
  it('resolveRecipients only targets consented, non-opted-out customers', () => {
    expect(svc).toContain('eq(s.customers.whatsappMarketingConsent, true)');
    expect(svc).toContain('eq(s.customers.whatsappOptOut, false)');
  });
});
