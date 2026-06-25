import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');
const providerStatusService = readFileSync(new URL('../packages/commerce-core/src/provider-status-service.ts', import.meta.url), 'utf-8');
const apiIndex = readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');

describe('Provider status regression', () => {
  it('exposes a store-scoped provider status route protected by auth and permissions', () => {
    expect(apiIndex).toContain("app.route('/merchant/:storeId/provider-status', providerStatusRouter)");
    expect(providerStatusRoute).toContain("providerStatusRouter.use('*', requireAuth(), requireStoreAccess())");
    expect(providerStatusRoute).toContain("requirePermission('settings:read')");
  });

  it('reports approved providers without leaking secrets', () => {
    // After QP 5 Route Migration 7/24, the provider-status
    // aggregation moved from the route into ProviderStatusService.
    // The route is now a thin pass-through.
    expect(providerStatusService).toContain("provider: 'geidea'");
    expect(providerStatusService).toContain("provider: 'oto'");
    // PR #236 (audit 2026-06-25): WhatsApp `mode` is now dynamic —
    // 'api' when Unifonic is wired, 'qr_contact' otherwise. The
    // string literal lives in the ternary's else branch.
    expect(providerStatusService).toMatch(/mode:\s*unifoncReady\s*\?\s*['"]api['"]\s*:\s*['"]qr_contact['"]/);
    expect(providerStatusService).toContain("getOfficialContactEmail()");
    // The route itself never touches any secret VALUE.
    expect(providerStatusRoute).not.toContain('GEIDEA_API_PASSWORD,');
    expect(providerStatusRoute).not.toContain('OTO_MARKETPLACE_TOKEN,');
    expect(providerStatusRoute).not.toContain('SMTP_PASSWORD,');
  });

  it('includes OTO marketplace-specific status fields', () => {
    // These literals live in the service now.
    expect(providerStatusService).toContain('shipping');
    expect(providerStatusService).toContain('shippingLabel');
    expect(providerStatusService).toContain('OtoMarketplaceService');
  });
});
