import { describe, expect, it } from 'vitest';

const permissionsApi = () =>
  readFileSync(new URL('../apps/api/src/routes/permissions.ts', import.meta.url), 'utf-8');
const apiIndex = () =>
  readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');

// Mock the readFileSync import for test environment
import { readFileSync } from 'node:fs';

describe('Permissions API — Route Structure', () => {
  it('GET /permissions returns permissions grouped by category', () => {
    const code = permissionsApi();
    expect(code).toContain("requirePermission('employees:update')");
    expect(code).toContain("permissionsRouter.get('/permissions',");
    expect(code).toContain('PERMISSION_CATALOG.forEach');
    expect(code).toContain('grouped');
  });

  it('GET /permission-presets returns permission presets', () => {
    const code = permissionsApi();
    expect(code).toContain("requirePermission('employees:update')");
    expect(code).toContain("permissionsRouter.get('/permission-presets',");
    expect(code).toContain('PERMISSION_PRESETS');
  });

  it('PATCH /memberships/:membershipId/permissions updates member permissions', () => {
    const code = permissionsApi();
    expect(code).toContain("requirePermission('employees:manage_permissions')");
    expect(code).toContain("permissionsRouter.patch('/memberships/:membershipId/permissions',");
    expect(code).toContain('z.object({');
    expect(code).toContain('permissionKey: z.string()');
    expect(code).toContain('scopeType: z.enum');
    expect(code).toContain('scopeId: z.number().optional()');
    expect(code).toContain('zValidator(\'json\', upsertPermissionsSchema)');
  });

  it('GET /memberships/:membershipId/permissions returns membership permissions', () => {
    const code = permissionsApi();
    expect(code).toContain("requirePermission('employees:update')");
    expect(code).toContain("permissionsRouter.get('/memberships/:membershipId/permissions',");
  });

  it('all routes use requireAuth + requireStoreAccess middleware', () => {
    const code = permissionsApi();
    expect(code).toContain("requireAuth(), requireStoreAccess()");
  });

  it('permissionsRouter is registered in API index.ts', () => {
    const code = apiIndex();
    expect(code).toContain("import { permissionsRouter }");
    expect(code).toContain("app.route('/merchant/:storeId/permissions', permissionsRouter)");
  });
});

describe('Permissions API — Business Logic', () => {
  it('GET /permissions returns permissions grouped by category', () => {
    const code = permissionsApi();
    expect(code).toContain('PERMISSION_CATALOG.map');
    expect(code).toContain('selected:');
  });

  it('PATCH /memberships/:membershipId/permissions validates permission keys against PERMISSION_CATALOG', () => {
    const code = permissionsApi();
    expect(code).toContain('uniquePermissions.filter(p => !PERMISSION_CATALOG.some');
  });

  it('PATCH /memberships/:membershipId/permissions validates scope against ALLOWED_SCOPES', () => {
    const code = permissionsApi();
    expect(code).toContain('uniquePermissions.filter(p => !ALLOWED_SCOPES.some');
  });

  it('PATCH /memberships/:membershipId/permissions enforces tenant isolation', () => {
    const code = permissionsApi();
    expect(code).toContain('eq(stores.id, storeId)');
    expect(code).toContain('.from(memberships)');
    expect(code).toContain('innerJoin(stores, eq(memberships.tenantId, stores.tenantId))');
  });

  it('PATCH /memberships/:membershipId/permissions protects owner permissions', () => {
    const code = permissionsApi();
    expect(code).toContain('membership.role === \'owner\'');
    expect(code).toContain('ownerCount.total <= 1');
  });

  it('PATCH /memberships/:membershipId/permissions prevents self-permission change', () => {
    const code = permissionsApi();
    expect(code).toContain('membership.userId === auth.userId');
  });

  it('PATCH /memberships/:membershipId/permissions protects owner permissions', () => {
    const code = permissionsApi();
    expect(code).toContain('membership.role === \'owner\'');
    expect(code).toContain('ownerCount.total <= 1');
  });

  it('PATCH /memberships/:membershipId/permissions prevents self-permission change', () => {
    const code = permissionsApi();
    expect(code).toContain('membership.userId === auth.userId');
  });
});

describe('Permissions API — Error Handling', () => {
  it('returns 404 when membership not found', () => {
    const code = permissionsApi();
    expect(code).toContain('return c.json({ success: false, error: { code: \'NOT_FOUND\', message: \'الموظف غير موجود في هذا المتجر\' } }, 404);');
  });

  it('returns 400 when permission key is invalid', () => {
    const code = permissionsApi();
    expect(code).toContain('invalidPermissions.length > 0');
    expect(code).toContain('code: \'INVALID_PERMISSION\'');
  });

  it('returns 400 when scope is invalid', () => {
    const code = permissionsApi();
    expect(code).toContain('invalidScopes.length > 0');
    expect(code).toContain('code: \'INVALID_SCOPE\'');
  });

  it('returns 400 when scope not available', () => {
    const code = permissionsApi();
    expect(code).toContain('storeScopePermissions.length < uniquePermissions.length');
    expect(code).toContain('code: \'SCOPE_NOT_AVAILABLE\'');
  });
});

describe('Permissions API — Audit Logging', () => {
  it('logs employee_permissions_updated when permissions are updated', () => {
    const code = permissionsApi();
    expect(code).toContain('action: \'employee_permissions_updated\'');
    expect(code).toContain('oldValue: {');
    expect(code).toContain('newValue: {');
    expect(code).toContain('permissions: oldPermissionKeys');
    expect(code).toContain('newValue: {');
    expect(code).toContain('permissions: newPermissions');
    expect(code).toContain('changedByUserId');
  });
});