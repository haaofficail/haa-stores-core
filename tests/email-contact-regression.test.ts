import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getOfficialContactEmail } from '../packages/commerce-core/src/contact-channels';

const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');
const providerStatusService = readFileSync(new URL('../packages/commerce-core/src/provider-status-service.ts', import.meta.url), 'utf-8');
const storefrontStoreInfoRoute = readFileSync(new URL('../apps/api/src/routes/storefront/store-info.ts', import.meta.url), 'utf-8');
const dashboardNotifications = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Notifications.tsx', import.meta.url), 'utf-8');

describe('Email contact regression', () => {
  it('uses info@haastores.com as official contact fallback until SMTP is configured', () => {
    expect(getOfficialContactEmail()).toBe('info@haastores.com');
    // After QP 5 Route Migration 7/24, the provider-status
    // aggregation moved into ProviderStatusService.
    expect(providerStatusService).toContain("status: smtpConfigured ? 'configured' : 'contact_only'");
    expect(storefrontStoreInfoRoute).toContain('getOfficialContactEmail()');
  });

  it('does not claim real email delivery without SMTP credentials', () => {
    // SMTP env-var names + the existence check live in the service now.
    expect(providerStatusService).toContain('SMTP_HOST');
    expect(providerStatusService).toContain('SMTP_USER');
    expect(providerStatusService).toContain('SMTP_PASSWORD');
    expect(dashboardNotifications).toContain('contact-only');
    expect(dashboardNotifications).toContain('info@haastores.com');
  });
});
