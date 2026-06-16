import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const permissionsRouteFile = resolve(projectRoot, 'apps/api/src/routes/permissions.ts');
const permissionServiceFile = resolve(projectRoot, 'packages/auth-core/src/permission-service.ts');
const authCoreIndex = resolve(projectRoot, 'packages/auth-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 5/24
 *
 * Pins the contract that the permissions route
 * (apps/api/src/routes/permissions.ts) was migrated from direct
 * Drizzle access to a dedicated PermissionService in
 * @haa/auth-core.
 *
 * Critical: this is RBAC business logic (membership permissions,
 * owner-protection, scope validation). It must live next to the
 * RBAC enforcement primitives (requirePermission, Permission
 * type) — NOT next to the merchant AuthFlowService or admin
 * AdminAuthService. The test asserts hard isolation.
 */
describe('Quality Pass 5 — Route Migration 5/24: permissions.ts', () => {
  it('permissions.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(permissionsRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('permissions.ts route must use PermissionService (NOT AuthFlowService / AdminAuthService)', () => {
    const content = read(permissionsRouteFile);
    expect(content).toMatch(/PermissionService/);
    // Hard guard: must NOT use merchant or admin auth services
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/@haa\/commerce-core/);
  });

  it('permissions.ts must preserve all 4 endpoints', () => {
    const content = read(permissionsRouteFile);
    expect(content).toMatch(/permissionsRouter\.get\(['"]\/permissions['"]/);
    expect(content).toMatch(/permissionsRouter\.get\(['"]\/permission-presets['"]/);
    expect(content).toMatch(/permissionsRouter\.get\(['"]\/memberships\/:membershipId\/permissions['"]/);
    expect(content).toMatch(/permissionsRouter\.patch\(['"]\/memberships\/:membershipId\/permissions['"]/);
  });

  it('permissions.ts must preserve all permission requirements (3× employees:update, 1× employees:manage_permissions)', () => {
    const content = read(permissionsRouteFile);
    const updateMatches = content.match(/requirePermission\(['"]employees:update['"]\)/g) || [];
    expect(updateMatches.length).toBe(3);
    const manageMatches = content.match(/requirePermission\(['"]employees:manage_permissions['"]\)/g) || [];
    expect(manageMatches.length).toBe(1);
  });

  it('permissions.ts must preserve file-level requireAuth + requireStoreAccess', () => {
    const content = read(permissionsRouteFile);
    expect(content).toMatch(/permissionsRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('permissions.ts must preserve 404 + NOT_FOUND for missing membership', () => {
    // The route maps the service's `not_found` error to 404 + NOT_FOUND.
    // The Arabic message lives in the service.
    const routeContent = read(permissionsRouteFile);
    const svcContent = read(permissionServiceFile);
    expect(routeContent).toMatch(/404/);
    expect(routeContent).toMatch(/NOT_FOUND/);
    expect(svcContent).toMatch(/الموظف غير موجود في هذا المتجر/);
  });

  it('permissions.ts must preserve 403 + FORBIDDEN for last-owner protection', () => {
    const routeContent = read(permissionsRouteFile);
    const svcContent = read(permissionServiceFile);
    expect(routeContent).toMatch(/403/);
    expect(routeContent).toMatch(/FORBIDDEN/);
    expect(svcContent).toMatch(/لا يمكن تغيير صلاحيات آخر مالك/);
  });

  it('permissions.ts must preserve 403 + FORBIDDEN for self-permission blocking', () => {
    const routeContent = read(permissionsRouteFile);
    const svcContent = read(permissionServiceFile);
    // The route still has 403 + FORBIDDEN mapping; the actual message
    // lives in the service.
    expect(routeContent).toMatch(/403/);
    expect(svcContent).toMatch(/لا يمكنك تغيير صلاحياتك/);
  });

  it('permissions.ts must preserve 400 + INVALID_PERMISSION / INVALID_SCOPE / SCOPE_NOT_AVAILABLE', () => {
    const content = read(permissionsRouteFile);
    expect(content).toMatch(/INVALID_PERMISSION/);
    expect(content).toMatch(/INVALID_SCOPE/);
    expect(content).toMatch(/SCOPE_NOT_AVAILABLE/);
  });

  it('permissions.ts must preserve the audit log entry (employee_permissions_updated action)', () => {
    // Audit log lives in the service now (it was the right place all
    // along — close to the data mutation). The route no longer needs
    // AuditLogService.
    const svcContent = read(permissionServiceFile);
    const routeContent = read(permissionsRouteFile);
    expect(svcContent).toMatch(/employee_permissions_updated/);
    expect(routeContent).not.toMatch(/AuditLogService/);
  });

  it('permissions.ts must preserve the response shape (membershipId + permissions array)', () => {
    const content = read(permissionsRouteFile);
    expect(content).toMatch(/membershipId/);
    expect(content).toMatch(/permissions/);
  });

  it('permissions.ts must NOT touch the membershipPermissions / tenantUsers / stores tables directly', () => {
    const content = read(permissionsRouteFile);
    expect(content).not.toMatch(/membershipPermissions/);
    expect(content).not.toMatch(/tenantUsers/);
    expect(content).not.toMatch(/s\.stores|s\.memberships/);
  });

  it('PermissionService must exist in @haa/auth-core', () => {
    expect(existsSync(permissionServiceFile)).toBe(true);
    const content = read(permissionServiceFile);
    expect(content).toMatch(/export\s+class\s+PermissionService/);
  });

  it('PermissionService must own all 3 membership operations the route uses', () => {
    const content = read(permissionServiceFile);
    // Read membership (with tenant guard)
    expect(content).toMatch(/async\s+getMembershipForStore|findMembership/);
    // Read membership permissions
    expect(content).toMatch(/async\s+listMembershipPermissions/);
    // Upsert membership permissions (with the full transaction)
    expect(content).toMatch(/async\s+upsertMembershipPermissions/);
  });

  it('PermissionService must NOT depend on merchant or admin auth', () => {
    const content = read(permissionServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/@haa\/commerce-core/);
  });

  it('PermissionService must be exported from @haa/auth-core', () => {
    const indexContent = read(authCoreIndex);
    expect(indexContent).toMatch(/permission-service/);
  });
});
