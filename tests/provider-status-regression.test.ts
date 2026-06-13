import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');
const apiIndex = readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');

describe('Provider status regression', () => {
  it('exposes a store-scoped provider status route protected by auth and permissions', () => {
    expect(apiIndex).toContain("app.route('/merchant/:storeId/provider-status', providerStatusRouter)");
    expect(providerStatusRoute).toContain("providerStatusRouter.use('*', requireAuth(), requireStoreAccess())");
    expect(providerStatusRoute).toContain("requirePermission('settings:read')");
  });

  it('reports approved providers without leaking secrets', () => {
    expect(providerStatusRoute).toContain("provider: 'geidea'");
    expect(providerStatusRoute).toContain("provider: 'oto'");
    expect(providerStatusRoute).toContain("mode: 'qr_contact'");
    expect(providerStatusRoute).toContain("getOfficialContactEmail()");
    expect(providerStatusRoute).not.toContain('GEIDEA_API_PASSWORD,');
    expect(providerStatusRoute).not.toContain('OTO_MARKETPLACE_TOKEN,');
    expect(providerStatusRoute).not.toContain('SMTP_PASSWORD,');
  });

  it('includes OTO marketplace-specific status fields', () => {
    expect(providerStatusRoute).toContain('shipping');
    expect(providerStatusRoute).toContain('shippingLabel');
    expect(providerStatusRoute).toContain('OtoMarketplaceService');
  });
});
