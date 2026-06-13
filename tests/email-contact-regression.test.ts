import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getOfficialContactEmail } from '../packages/commerce-core/src/contact-channels';

const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');
const storefrontRoute = readFileSync(new URL('../apps/api/src/routes/storefront.ts', import.meta.url), 'utf-8');
const dashboardNotifications = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Notifications.tsx', import.meta.url), 'utf-8');

describe('Email contact regression', () => {
  it('uses info@haasoft.com as official contact fallback until SMTP is configured', () => {
    expect(getOfficialContactEmail()).toBe('info@haasoft.com');
    expect(providerStatusRoute).toContain("status: smtpConfigured ? 'configured' : 'contact_only'");
    expect(storefrontRoute).toContain('getOfficialContactEmail()');
  });

  it('does not claim real email delivery without SMTP credentials', () => {
    expect(providerStatusRoute).toContain('SMTP_HOST');
    expect(providerStatusRoute).toContain('SMTP_USER');
    expect(providerStatusRoute).toContain('SMTP_PASSWORD');
    expect(dashboardNotifications).toContain('contact-only');
    expect(dashboardNotifications).toContain('info@haasoft.com');
  });
});
