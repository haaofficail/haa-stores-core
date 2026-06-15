import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const employeesRouteFile = resolve(projectRoot, 'apps/api/src/routes/employees.ts');
const employeeServiceFile = resolve(projectRoot, 'packages/auth-core/src/employee-service.ts');
const tenantOwnersHelperFile = resolve(projectRoot, 'packages/auth-core/src/tenant-owners-helper.ts');
const authCoreIndex = resolve(projectRoot, 'packages/auth-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 6/24
 *
 * Pins the contract that the employees route
 * (apps/api/src/routes/employees.ts) was migrated from direct
 * Drizzle access to an EmployeeService in @haa/auth-core.
 *
 * Important: this is employee membership management, NOT permission
 * assignment. PermissionService already owns the
 * membershipPermissions table; this service owns the tenantUsers
 * (membership row) + the related users row.
 *
 * Owner-protection is a SHARED concern between PermissionService
 * (can't demote the last owner) and EmployeeService (can't
 * delete/demote the last owner). The two services share a small
 * `countTenantOwners` helper to keep the rule in one place.
 */
describe('Quality Pass 5 — Route Migration 6/24: employees.ts', () => {
  it('employees.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(employeesRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('employees.ts route must use EmployeeService (NOT inline DB queries)', () => {
    const content = read(employeesRouteFile);
    expect(content).toMatch(/EmployeeService/);
    // No inline db.select / db.update / db.insert / db.delete
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
  });

  it('employees.ts must preserve all 4 endpoints', () => {
    const content = read(employeesRouteFile);
    expect(content).toMatch(/employeesRouter\.get\(['"]\/['"]/);
    expect(content).toMatch(/employeesRouter\.post\(['"]\/invite['"]/);
    expect(content).toMatch(/employeesRouter\.patch\(['"]\/:employeeId['"]/);
    expect(content).toMatch(/employeesRouter\.delete\(['"]\/:employeeId['"]/);
  });

  it('employees.ts must preserve all 4 permission requirements', () => {
    const content = read(employeesRouteFile);
    expect(content).toMatch(/requirePermission\(['"]employees:view['"]\)/);
    expect(content).toMatch(/requirePermission\(['"]employees:invite['"]\)/);
    expect(content).toMatch(/requirePermission\(['"]employees:update['"]\)/);
    expect(content).toMatch(/requirePermission\(['"]employees:delete['"]\)/);
  });

  it('employees.ts must preserve the file-level requireAuth + requireStoreAccess', () => {
    const content = read(employeesRouteFile);
    expect(content).toMatch(/employeesRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('employees.ts must preserve 404 + NOT_FOUND for missing employee', () => {
    // Route maps service's `not_found` to 404 + NOT_FOUND. The
    // actual Arabic message lives in the service.
    const routeContent = read(employeesRouteFile);
    const svcContent = read(employeeServiceFile);
    expect(routeContent).toMatch(/404/);
    expect(routeContent).toMatch(/NOT_FOUND/);
    expect(svcContent).toMatch(/الموظف غير موجود/);
  });

  it('employees.ts must preserve 403 + FORBIDDEN for owner protection (3 distinct messages)', () => {
    // The route maps 4 distinct service error kinds to 403 +
    // FORBIDDEN. The actual Arabic messages live in the service.
    const routeContent = read(employeesRouteFile);
    const svcContent = read(employeeServiceFile);
    expect(routeContent).toMatch(/403/);
    expect(routeContent).toMatch(/FORBIDDEN/);
    expect(svcContent).toMatch(/لا يمكن تخفيض آخر مالك/);
    expect(svcContent).toMatch(/لا يمكن حذف آخر مالك/);
    expect(svcContent).toMatch(/لا يمكنك تغيير دورك بنفسك/);
    expect(svcContent).toMatch(/لا يمكنك حذف نفسك/);
  });

  it('employees.ts must preserve 409 + CONFLICT for duplicate invite', () => {
    // Route maps the service's `duplicate` kind to 409 + CONFLICT.
    // The actual Arabic message lives in the service.
    const routeContent = read(employeesRouteFile);
    const svcContent = read(employeeServiceFile);
    expect(routeContent).toMatch(/409/);
    expect(routeContent).toMatch(/CONFLICT/);
    expect(svcContent).toMatch(/هذا المستخدم موجود بالفعل في هذا المتجر/);
  });

  it('employees.ts must preserve 201 on successful invite', () => {
    const content = read(employeesRouteFile);
    expect(content).toMatch(/201/);
  });

  it('employees.ts must preserve the role-rank check (non-owner cannot grant higher role)', () => {
    // This is a specific employees.ts business rule: a non-owner
    // actor cannot grant a role higher than their own. It's in
    // the service now.
    const svcContent = read(employeeServiceFile);
    expect(svcContent).toMatch(/requestedRank|rank|VALID_ROLES\.indexOf/);
  });

  it('employees.ts must preserve all 6 audit actions', () => {
    // employee_invited, employee_duplicate_rejected,
    // employee_self_restriction_blocked, employee_last_owner_blocked,
    // employee_role_changed, employee_removed / employee_status_changed
    const svcContent = read(employeeServiceFile);
    expect(svcContent).toMatch(/employee_invited/);
    expect(svcContent).toMatch(/employee_duplicate_rejected/);
    expect(svcContent).toMatch(/employee_self_restriction_blocked/);
    expect(svcContent).toMatch(/employee_last_owner_blocked/);
    expect(svcContent).toMatch(/employee_role_changed/);
    expect(svcContent).toMatch(/employee_removed/);
  });

  it('employees.ts must not touch tenantUsers / users tables directly', () => {
    const content = read(employeesRouteFile);
    expect(content).not.toMatch(/s\.tenantUsers/);
    expect(content).not.toMatch(/s\.users/);
  });

  it('employees.ts must not call AuditLogService directly (audit is in the service)', () => {
    const content = read(employeesRouteFile);
    expect(content).not.toMatch(/AuditLogService/);
    expect(content).not.toMatch(/audit\.record/);
  });

  it('EmployeeService must exist in @haa/auth-core', () => {
    expect(existsSync(employeeServiceFile)).toBe(true);
    const content = read(employeeServiceFile);
    expect(content).toMatch(/export\s+class\s+EmployeeService/);
  });

  it('EmployeeService must own all 4 operations the route uses', () => {
    const content = read(employeeServiceFile);
    expect(content).toMatch(/async\s+list/);
    expect(content).toMatch(/async\s+invite/);
    expect(content).toMatch(/async\s+update/);
    expect(content).toMatch(/async\s+revoke/);
  });

  it('PermissionService and EmployeeService must share the owner-count helper', () => {
    // The shared helper avoids duplicating the "count owners in
    // tenant, optionally excluding one user" primitive across two
    // services. Rule 12 of the migration: "use it with clarity, do
    // not duplicate the same RBAC rules inside employees service".
    expect(existsSync(tenantOwnersHelperFile)).toBe(true);
    const helperContent = read(tenantOwnersHelperFile);
    expect(helperContent).toMatch(/export\s+(async\s+function|function)\s+countTenantOwners/);
  });

  it('EmployeeService must import the shared owner-count helper (NOT reimplement it)', () => {
    const content = read(employeeServiceFile);
    // Either same-file import or use of the helper
    const helperContent = read(tenantOwnersHelperFile);
    const helperFnName = helperContent.match(/countTenantOwners/)?.[0];
    expect(helperFnName).toBeDefined();
    expect(content).toMatch(new RegExp(helperFnName!));
  });

  it('EmployeeService must NOT depend on merchant or admin auth', () => {
    const content = read(employeeServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/@haa\/commerce-core/);
  });

  it('EmployeeService must be exported from @haa/auth-core', () => {
    const indexContent = read(authCoreIndex);
    expect(indexContent).toMatch(/employee-service/);
  });
});
