import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGE = readFileSync(new URL('../apps/merchant-dashboard/src/pages/WhatsApp.tsx', import.meta.url), 'utf-8');
const API_CLIENT = readFileSync(new URL('../apps/merchant-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');
const QUERY_CLIENT = readFileSync(new URL('../apps/merchant-dashboard/src/lib/queryClient.ts', import.meta.url), 'utf-8');
const ROUTE = readFileSync(new URL('../apps/api/src/routes/whatsapp-campaigns.ts', import.meta.url), 'utf-8');
const SERVICE = readFileSync(new URL('../packages/commerce-core/src/whatsapp-campaigns.ts', import.meta.url), 'utf-8');

describe('merchant WhatsApp campaign UI contract', () => {
  it('exposes a typed client for campaign list, preview, create, send, and delete', () => {
    expect(API_CLIENT).toContain('export interface WhatsappCampaign');
    expect(API_CLIENT).toContain('export const whatsappCampaignsApi');
    expect(API_CLIENT).toContain('/whatsapp-campaigns/preview');
    expect(API_CLIENT).toContain('/whatsapp-campaigns/${id}/send');
    expect(API_CLIENT).toContain("request<{ deleted: true }>");
  });

  it('uses a centralized per-store query key for WhatsApp campaigns', () => {
    expect(QUERY_CLIENT).toContain('whatsappCampaigns: (storeId');
    expect(PAGE).toContain('queryKeys.whatsappCampaigns(storeId)');
    expect(PAGE).toContain('invalidateQueries({ queryKey: campaignQueryKey })');
  });

  it('loads, previews, creates, sends, and deletes campaigns from the WhatsApp page', () => {
    expect(PAGE).toContain('useQuery');
    expect(PAGE).toContain('whatsappCampaignsApi.list');
    expect(PAGE).toContain('whatsappCampaignsApi.preview');
    expect(PAGE).toContain('whatsappCampaignsApi.create');
    expect(PAGE).toContain('whatsappCampaignsApi.send');
    expect(PAGE).toContain('whatsappCampaignsApi.delete');
    expect(PAGE).toContain('data-testid="whatsapp-campaign-create-form"');
    expect(PAGE).toContain('data-testid="whatsapp-campaigns-table"');
  });

  it('gates campaign actions with server-aligned promotions permissions', () => {
    expect(PAGE).toContain("can('promotions:read')");
    expect(PAGE).toContain("can('promotions:create')");
    expect(PAGE).toContain("can('promotions:delete')");
    expect(ROUTE).toContain("requirePermission('promotions:read')");
    expect(ROUTE).toContain("requirePermission('promotions:create')");
    expect(ROUTE).toContain("requirePermission('promotions:delete')");
  });

  it('surfaces consent and opt-out constraints in the merchant workflow', () => {
    expect(PAGE).toContain('موافقة العميل التسويقية');
    expect(PAGE).toContain('إيقاف أو STOP');
    expect(SERVICE).toContain('whatsappMarketingConsent');
    expect(SERVICE).toContain('whatsappOptOut');
  });

  it('keeps API responses compatible with the dashboard request() data contract', () => {
    expect(ROUTE).toContain('data: { started: true }');
    expect(ROUTE).toContain('data: { deleted: true }');
  });

  it('marks scheduled campaigns as scheduled so the worker can pick them up', () => {
    expect(SERVICE).toContain("status: input.scheduledAt ? 'scheduled' : 'draft'");
  });
});
