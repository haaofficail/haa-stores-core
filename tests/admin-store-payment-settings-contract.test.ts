import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const adminApiClient = read('apps/admin-dashboard/src/lib/api.ts');
const storePaymentSettingsPage = read('apps/admin-dashboard/src/pages/StorePaymentSettings.tsx');
const adminIndexRoute = read('apps/api/src/routes/admin/index.ts');
const tenantStoreRoutes = read('apps/api/src/routes/admin/tenants-stores.ts');

describe('admin store payment settings contract', () => {
  it('keeps the dashboard payload aligned with the API validator', () => {
    expect(storePaymentSettingsPage).toContain('const safeEnabled = row.enabled && isProviderConfigured(row)');
    expect(storePaymentSettingsPage).toContain('enabled: safeEnabled');
    expect(storePaymentSettingsPage).toContain('status: row.status');
    expect(storePaymentSettingsPage).toContain("supportedPaymentMethod: 'card'");

    expect(adminIndexRoute).toContain('enabled: z.boolean().optional()');
    expect(adminIndexRoute).toContain(
      "status: z.enum(['active', 'suspended', 'not_configured', 'configured', 'invalid']).optional()",
    );
    expect(adminIndexRoute).toContain('supportedPaymentMethod: z.string().min(1).max(50).optional()');
    expect(adminIndexRoute).not.toContain("status: z.enum(['active', 'inactive', 'pending_review']).optional()");
  });

  it('persists enabled/status updates and supplies insert defaults safely', () => {
    expect(tenantStoreRoutes).toContain('const enabled = body.enabled ?? body.isEnabled');
    expect(tenantStoreRoutes).toContain('enabled: enabled ?? false');
    expect(tenantStoreRoutes).toContain("status: body.status ?? 'not_configured'");
    expect(tenantStoreRoutes).toContain("supportedPaymentMethod: body.supportedPaymentMethod ?? 'card'");
    expect(tenantStoreRoutes).toContain('if (enabled !== undefined) updateData.enabled = enabled;');
    expect(tenantStoreRoutes).toContain('if (body.status !== undefined) updateData.status = body.status;');
    expect(tenantStoreRoutes).toContain('if (body.supportedPaymentMethod !== undefined) updateData.supportedPaymentMethod = body.supportedPaymentMethod;');
    expect(tenantStoreRoutes).not.toContain('set: { enabled: body.enabled, mode: body.mode, status: body.status');
  });

  it('keeps the admin client and page typed without reintroducing page-local any', () => {
    expect(adminApiClient).toContain(
      "export type AdminStorePaymentStatus = 'active' | 'suspended' | 'not_configured' | 'configured' | 'invalid'",
    );
    expect(adminApiClient).toContain('data: AdminStorePaymentSettingsUpdate');
    expect(adminApiClient).toContain("request<AdminStorePaymentSetting>('PUT'");

    expect(storePaymentSettingsPage).toContain('useMutation<ProviderSetting, Error, SavePaymentSettingsVars>');
    expect(storePaymentSettingsPage).toContain("value === 'configured'");
    expect(storePaymentSettingsPage).toContain("value === 'invalid'");
    expect(storePaymentSettingsPage).toContain('function paymentDecision(row: RowState)');
    expect(storePaymentSettingsPage).toContain('غير قابلة للتفعيل');
    expect(storePaymentSettingsPage).toContain('checked={row.enabled}');
    expect(storePaymentSettingsPage).toContain('مفعلة مخزنة');
    expect(storePaymentSettingsPage).toContain('عند الحفظ سيُرسل enabled=false');
    expect(storePaymentSettingsPage).toContain('التفعيل: {decision.enabledLabel}');
    expect(storePaymentSettingsPage).toMatch(/row\.status === 'configured'\s*\?\s*<option value="configured">/);
    expect(storePaymentSettingsPage).not.toContain('@typescript-eslint/no-explicit-any');
    expect(storePaymentSettingsPage).not.toMatch(/:\s*any\b/);
    expect(storePaymentSettingsPage).not.toMatch(/\bas\s+any\b/);
  });
});
