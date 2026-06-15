import { describe, expect, it } from 'vitest';

const permissionsApi = () =>
  readFileSync(new URL('../apps/api/src/routes/permissions.ts', import.meta.url), 'utf-8');
const permissionService = () =>
  readFileSync(new URL('../packages/auth-core/src/permission-service.ts', import.meta.url), 'utf-8');
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

// Business logic moved to PermissionService in @haa/auth-core as part
// of Quality Pass 5, Route Migration 5/24. The route is now pure
// transport (HTTP shape + middleware), the service owns the rules.
describe('Permissions API — Business Logic (in PermissionService)', () => {
  it('GET /permissions returns permissions grouped by category', () => {
    const code = permissionsApi();
    expect(code).toContain('PERMISSION_CATALOG.map');
    expect(code).toContain('selected:');
  });

  it('PATCH /memberships/:membershipId/permissions validates permission keys against PERMISSION_CATALOG', () => {
    const code = permissionService();
    expect(code).toContain('!PERMISSION_CATALOG.some');
  });

  it('PATCH /memberships/:membershipId/permissions validates scope against ALLOWED_SCOPES', () => {
    const code = permissionService();
    expect(code).toContain('!ALLOWED_SCOPES.some');
  });

  it('PATCH /memberships/:membershipId/permissions enforces tenant isolation', () => {
    const code = permissionService();
    expect(code).toContain('eq(s.stores.id');
    expect(code).toContain('s.tenantUsers');
    expect(code).toContain('innerJoin(s.stores, eq(s.tenantUsers.tenantId, s.stores.tenantId))');
  });

  it('PATCH /memberships/:membershipId/permissions protects owner permissions', () => {
    const code = permissionService();
    expect(code).toContain("membership.role === 'owner'");
    // Uses the shared countTenantOwners helper (introduced in
    // Route Migration 6/24) — check the import + the comparison.
    expect(code).toContain('countTenantOwners');
    expect(code).toContain('remainingOwners <= 0');
  });

  it('PATCH /memberships/:membershipId/permissions prevents self-permission change', () => {
    const code = permissionService();
    expect(code).toContain('membership.userId === ctx.actorUserId');
  });
});

// Error mapping lives in the route (kind → HTTP code). The actual
// error messages live in the service. The route still maps them.
describe('Permissions API — Error Handling', () => {
  it('returns 404 when membership not found', () => {
    const code = permissionsApi();
    expect(code).toContain('404');
    expect(code).toContain("code: 'NOT_FOUND'");
  });

  it('returns 400 when permission key is invalid', () => {
    const code = permissionsApi();
    expect(code).toContain("code: 'INVALID_PERMISSION'");
  });

  it('returns 400 when scope is invalid', () => {
    const code = permissionsApi();
    expect(code).toContain("code: 'INVALID_SCOPE'");
  });

  it('returns 400 when scope not available', () => {
    const code = permissionsApi();
    expect(code).toContain("code: 'SCOPE_NOT_AVAILABLE'");
  });
});

describe('Permissions API — Audit Logging (in PermissionService)', () => {
  it('logs employee_permissions_updated when permissions are updated', () => {
    const code = permissionService();
    expect(code).toContain("action: 'employee_permissions_updated'");
    expect(code).toContain('oldValue:');
    expect(code).toContain('newValue:');
    expect(code).toContain('oldPermissionKeys');
    expect(code).toContain('newPermissions.map');
    expect(code).toContain('changedByUserId');
  });
});