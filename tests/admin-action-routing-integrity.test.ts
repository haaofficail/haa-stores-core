import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const app = read('apps/admin-dashboard/src/App.tsx');
const storesPage = read('apps/admin-dashboard/src/pages/Stores.tsx');
const adminIndex = read('apps/api/src/routes/admin/index.ts');
const adminTenantStoreRoutes = read('apps/api/src/routes/admin/tenants-stores.ts');
const adminOperationsRoutes = read('apps/api/src/routes/admin/operations.ts');

describe('admin action routing integrity', () => {
  it('uses the non-blocked /users route in the sidebar and keeps /admin-users as redirect only', () => {
    expect(app).toContain('/users|المستخدمون|UserCog|users.read');
    expect(app).toContain('<Route path="/users" element={<AdminPermissionRoute permission="users.read"><AdminUsers /></AdminPermissionRoute>} />');
    expect(app).toContain('<Route path="/admin-users" element={<Navigate to="/users" replace />} />');
    expect(app).not.toContain('/admin-users|المستخدمون|UserCog|users.read');
  });

  it('keeps the store create/edit form aligned with the API slug contract', () => {
    expect(storesPage).toContain("useState({ name: '', slug: '', tenantId: '', email: '', phone: '', isActive: 'true' })");
    expect(storesPage).toContain('slug: payload.slug');
    expect(storesPage).toContain('email: payload.email');
    expect(storesPage).toContain('phone: payload.phone');
    expect(storesPage).toContain('queryFn: () => adminApi.getTenants()');
    expect(storesPage).toContain('اختر التاجر');
    expect(storesPage).not.toContain('domain: data.domain');
    expect(storesPage).not.toContain('form.domain');
  });

  it('keeps admin store validation canonical while accepting the old domain alias', () => {
    expect(adminIndex).toContain('const storeSlugSchema');
    expect(adminIndex).toContain('slug: storeSlugSchema.optional()');
    expect(adminIndex).toContain('domain: storeSlugSchema.optional()');
    expect(adminIndex).toContain('Store slug is required');
    expect(adminTenantStoreRoutes).toContain('const slug = body.slug ?? body.domain');
    expect(adminTenantStoreRoutes).toContain('if (body.slug || body.domain) storePatch.slug = body.slug ?? body.domain');
  });

  it('does not use broad selects for high-traffic admin list/settings/user routes', () => {
    expect(adminTenantStoreRoutes).toContain('const adminTenantSelect');
    expect(adminTenantStoreRoutes).toContain('const adminStoreListSelect');
    expect(adminTenantStoreRoutes).not.toContain('const tenants = await db.select().from(s.tenants)');
    expect(adminTenantStoreRoutes).not.toContain('const stores = await db.select().from(s.stores)');

    expect(adminOperationsRoutes).toContain('const platformSettingsTenantSelect');
    expect(adminOperationsRoutes).toContain('const adminUserListSelect');
    expect(adminOperationsRoutes).not.toContain('db.select().from(s.tenants).limit(1)');
    expect(adminOperationsRoutes).not.toContain('db.select().from(s.users)');
    expect(adminOperationsRoutes).not.toContain('passwordHash');
    expect(adminOperationsRoutes).not.toContain('adminTotpSecretEncrypted');
  });
});
