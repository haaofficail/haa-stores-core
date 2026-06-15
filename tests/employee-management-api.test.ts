import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const employeesRoute = () =>
  readFileSync(new URL('../apps/api/src/routes/employees.ts', import.meta.url), 'utf-8');
const employeeService = () =>
  readFileSync(new URL('../packages/auth-core/src/employee-service.ts', import.meta.url), 'utf-8');
const apiIndex = () =>
  readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');
const dashboardApi = () =>
  readFileSync(new URL('../apps/merchant-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');

describe('Employee Management API — Route Structure', () => {
  it('GET / lists employees with employees:view permission', () => {
    const code = employeesRoute();
    expect(code).toContain("requirePermission('employees:view')");
    expect(code).toContain("employeesRouter.get('/'");
  });

  it('POST /invite creates employee with employees:invite permission', () => {
    const code = employeesRoute();
    expect(code).toContain("requirePermission('employees:invite')");
    expect(code).toContain("employeesRouter.post('/invite'");
  });

  it('PATCH /:employeeId updates employee with employees:update permission', () => {
    const code = employeesRoute();
    expect(code).toContain("requirePermission('employees:update')");
    expect(code).toContain("employeesRouter.patch('/:employeeId'");
  });

  it('DELETE /:employeeId removes employee with employees:delete permission', () => {
    const code = employeesRoute();
    expect(code).toContain("requirePermission('employees:delete')");
    expect(code).toContain("employeesRouter.delete('/:employeeId'");
  });

  it('PATCH /:employeeId/permissions is now handled by permissions API', () => {
    const code = employeesRoute();
    expect(code).not.toContain("employeesRouter.patch('/:employeeId/permissions'");
    // The permissions endpoint is now handled by the permissions API at /stores/:storeId/memberships/:membershipId/permissions
  });

  it('all routes use requireAuth + requireStoreAccess middleware', () => {
    const code = employeesRoute();
    expect(code).toContain("requireAuth(), requireStoreAccess()");
  });

  it('employeesRouter is registered in API index.ts', () => {
    const code = apiIndex();
    expect(code).toContain("import { employeesRouter }");
    expect(code).toContain("/merchant/:storeId/employees', employeesRouter");
  });
});

describe('Employee Management API — Validation Schemas', () => {
  it('inviteSchema validates name, email, password, role', () => {
    const code = employeesRoute();
    expect(code).toContain('inviteSchema');
    expect(code).toContain('name: z.string()');
    expect(code).toContain('email: z.string().email()');
    expect(code).toContain('password: z.string().min(6)');
    expect(code).toContain('role: z.enum');
  });

  it('updateEmployeeSchema validates optional role and isActive', () => {
    const code = employeesRoute();
    expect(code).toContain('updateEmployeeSchema');
    expect(code).toContain('role: z.enum');
    expect(code).toContain('isActive: z.boolean().optional()');
  });

  it('VALID_ROLES derived from ROLE_PERMISSIONS', () => {
    const code = employeesRoute();
    expect(code).toContain("Object.keys(ROLE_PERMISSIONS)");
  });
});

describe('Employee Management API — Safety Rules (in EmployeeService)', () => {
  it('blocks deleting last owner', () => {
    const code = employeeService();
    expect(code).toContain('لا يمكن حذف آخر مالك');
    expect(code).toContain('countTenantOwners');
  });

  it('blocks demoting last owner', () => {
    const code = employeeService();
    expect(code).toContain('لا يمكن تخفيض آخر مالك');
    expect(code).toContain('countTenantOwners');
  });

  it('blocks self-role-change', () => {
    const code = employeeService();
    expect(code).toContain('لا يمكنك تغيير دورك بنفسك');
  });

  it('blocks self-delete', () => {
    const code = employeeService();
    expect(code).toContain('لا يمكنك حذف نفسك');
  });

  it('only owner can assign owner role', () => {
    const code = employeeService();
    expect(code).toContain('فقط المالك يمكنه تعيين مالك جديد');
  });

  it('rejects duplicate employee in same tenant', () => {
    const code = employeeService();
    expect(code).toContain('هذا المستخدم موجود بالفعل في هذا المتجر');
  });

  it('rejects invalid role', () => {
    const code = employeesRoute();
    expect(code).toContain('Invalid role');
  });
});

describe('Employee Management API — Permissions Derivation', () => {
  it('returns permissions derived from getPermissionsForRole()', () => {
    // Used in the service (via the EmployeeRow mapping)
    const code = employeeService();
    expect(code).toContain('getPermissionsForRole');
    const matches = code.match(/getPermissionsForRole/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(1);
  });

  it('EmployeeService imports ROLE_PERMISSIONS and getPermissionsForRole from @haa/shared', () => {
    const code = employeeService();
    expect(code).toContain("getPermissionsForRole");
    expect(code).toContain("ROLE_PERMISSIONS");
  });
});

describe('Employee Management API — Dashboard API Client', () => {
  it('employeesApi.list exists', () => {
    const code = dashboardApi();
    expect(code).toContain("employeesApi.list");
    expect(code).toContain("/merchant/${storeId}/employees");
  });

  it('employeesApi.invite exists', () => {
    const code = dashboardApi();
    expect(code).toContain("employeesApi.invite");
    expect(code).toContain("/merchant/${storeId}/employees/invite");
  });

  it('employeesApi.update exists', () => {
    const code = dashboardApi();
    expect(code).toContain("employeesApi.update");
    expect(code).toContain("/merchant/${storeId}/employees/${employeeId}");
  });

  it('employeesApi.remove exists', () => {
    const code = dashboardApi();
    expect(code).toContain("employeesApi.remove");
    expect(code).toContain("DELETE");
  });

  it('Employee interface matches API response shape', () => {
    const code = dashboardApi();
    expect(code).toContain("interface Employee");
    expect(code).toContain("userId: number");
    expect(code).toContain("permissions: string[]");
    expect(code).toContain("lastLoginAt: string | null");
  });
});

describe('Employee Management API — Error Codes (route layer)', () => {
  it('returns RBAC-001 compatible 403 on permission denial', () => {
    const code = employeesRoute();
    expect(code).toContain('403');
    expect(code).toContain('FORBIDDEN');
  });

  it('returns 404 when employee not found', () => {
    const code = employeesRoute();
    expect(code).toContain('404');
    expect(code).toContain('NOT_FOUND');
  });

  it('returns 409 CONFLICT on duplicate employee', () => {
    const code = employeesRoute();
    expect(code).toContain('409');
    expect(code).toContain('CONFLICT');
  });

  it('permissions are now handled by permissions API', () => {
    const code = employeesRoute();
    // The permissions are now handled by the permissions API at /stores/:storeId/memberships/:membershipId/permissions
    expect(code).not.toContain('membership_permissions');
  });
});

describe('Employee Management API — Audit Logging (in EmployeeService)', () => {
  it('imports AuditLogService from @haa/integration-core', () => {
    const code = employeeService();
    expect(code).toContain("import { AuditLogService } from '@haa/integration-core'");
  });

  it('logs employee_duplicate_rejected on duplicate invite', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_duplicate_rejected'");
  });

  it('logs employee_invited on successful invite', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_invited'");
  });

  it('logs employee_self_restriction_blocked on self-role-change', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_self_restriction_blocked'");
  });

  it('logs employee_last_owner_blocked on last-owner delete', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_last_owner_blocked'");
  });

  it('logs employee_role_changed on role update success', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_role_changed'");
  });

  it('logs employee_status_changed on status toggle', () => {
    const code = employeeService();
    expect(code).toContain("'employee_status_changed'");
  });

  it('logs employee_removed on delete or status deactivation', () => {
    const code = employeeService();
    expect(code).toContain("action: 'employee_removed'");
  });

  it('permission updates are now logged by permissions API', () => {
    const code = employeesRoute();
    // The employee_permissions_updated audit is now logged by the permissions API
    expect(code).not.toContain("action: 'employee_permissions_updated'");
  });

  it('all audit calls pass storeId in the service', () => {
    const code = employeeService();
    // The service is now responsible for passing storeId from ctx
    // (it was previously the route's responsibility).
    const storeIdRefs = code.match(/storeId: ctx\.storeId/g);
    expect(storeIdRefs).toBeTruthy();
    expect(storeIdRefs!.length).toBeGreaterThanOrEqual(5);
  });

  it('passes entityType employee in all audit calls', () => {
    const code = employeeService();
    const matches = code.match(/entityType: 'employee'/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });
});
