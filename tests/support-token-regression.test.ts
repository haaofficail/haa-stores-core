import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('Support ticket access token regression', () => {
  it('does not create storefront support ticket links with accessToken in the URL', () => {
    const supportPage = source('apps/storefront/src/pages/Support.tsx');
    expect(supportPage).not.toContain('?accessToken=');
    expect(supportPage).toContain('support-ticket-token:');
    expect(supportPage).toContain('Access code');
  });

  it('sends support ticket access token via headers from the storefront API client', () => {
    const apiClient = source('apps/storefront/src/lib/api.ts');
    expect(apiClient).toContain("'X-Support-Access-Token': accessToken");
    expect(apiClient).not.toContain('support/tickets/${ticketId}?accessToken=');
    expect(apiClient).toContain('body: JSON.stringify({ message })');
  });

  it('keeps temporary API compatibility while preferring header tokens', () => {
    const storefrontSupport = source('apps/api/src/routes/storefront/support.ts');
    // Header takes priority
    expect(storefrontSupport).toContain("c.req.header('x-support-access-token')");
    // Authorization header bearer is also accepted
    expect(storefrontSupport).toContain("c.req.header('authorization')");
    // Legacy query-string access is still allowed for backwards compatibility
    expect(storefrontSupport).toContain("c.req.query('accessToken')");
    // No tokens are baked into the URL patterns
    expect(storefrontSupport).not.toContain("/:slug/support/tickets/:ticketId?accessToken=");
  });
});
