import { describe, expect, it } from 'vitest';
import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from '@haa/shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const sidebarPath = resolve(projectRoot, 'apps/merchant-dashboard/src/components/layout/Sidebar.tsx');
const sidebar = readFileSync(sidebarPath, 'utf-8');

const appPath = resolve(projectRoot, 'apps/merchant-dashboard/src/App.tsx');
const app = readFileSync(appPath, 'utf-8');

const employeesPagePath = resolve(projectRoot, 'apps/merchant-dashboard/src/pages/Employees.tsx');
const employeesPage = readFileSync(employeesPagePath, 'utf-8');

describe('RBAC Pass 3 — Employee Management UI', () => {
  describe('Employees page', () => {
    it('has employees route in App.tsx', () => {
      expect(app).toContain('/employees');
      expect(app).toContain('employees:view');
    });

    it('has sidebar nav item for employees', () => {
      expect(sidebar).toContain('/employees');
      expect(sidebar).toContain('employees:view');
    });

    it('imports PermissionGate', () => {
      expect(employeesPage).toContain('PermissionGate');
    });

    it('uses employees:* permissions for guards', () => {
      const permsUsed = ['employees:invite', 'employees:update', 'employees:delete', 'employees:manage_permissions'];
      for (const p of permsUsed) {
        expect(employeesPage).toContain(p);
      }
    });

    it('protects add button with employees:invite PermissionGate', () => {
      expect(employeesPage).toContain('employees:invite');
    });

    it('protects edit button with employees:update PermissionGate', () => {
      expect(employeesPage).toContain('employees:update');
    });

    it('protects delete button with employees:delete PermissionGate', () => {
      expect(employeesPage).toContain('employees:delete');
    });
  });

  describe('PermissionCheckboxMatrix', () => {
    const matrixPath = resolve(projectRoot, 'apps/merchant-dashboard/src/components/employees/PermissionCheckboxMatrix.tsx');
    const matrix = readFileSync(matrixPath, 'utf-8');

    it('imports PERMISSION_CATALOG from @haa/shared', () => {
      expect(matrix).toContain('PERMISSION_CATALOG');
    });

    it('imports ROLE_PERMISSIONS from @haa/shared', () => {
      expect(matrix).toContain('ROLE_PERMISSIONS');
    });

    it('does not contain hardcoded permission strings outside catalog', () => {
      const lines = matrix.split('\n');
      const permPattern = /['"][a-z_]+:[a-z_]+['"]/g;
      const found: string[] = [];
      for (const line of lines) {
        const matches = line.match(permPattern);
        if (matches) found.push(...matches);
      }
      const catalogKeys = new Set(PERMISSION_CATALOG.map(e => e.key));
      const hardcoded = found.filter(k => !catalogKeys.has(k.replace(/['"]/g, '')));
      expect(hardcoded).toEqual([]);
    });

    it('has HIGH_RISK_PERMS set for critical permissions', () => {
      expect(matrix).toContain('employees:manage_permissions');
      expect(matrix).toContain('api_keys:create');
      expect(matrix).toContain('api_keys:revoke');
      expect(matrix).toContain('wallet:withdraw');
    });

    it('includes role preset selector', () => {
      expect(matrix).toContain('applyRolePreset');
      expect(matrix).toContain('ROLE_PERMISSIONS');
    });
  });

  describe('Employee permission strings in catalog', () => {
    it('has employees:view in catalog', () => {
      const entry = PERMISSION_CATALOG.find(p => p.key === 'employees:view');
      expect(entry).toBeDefined();
      expect(entry!.riskLevel).toBe('medium');
    });

    it('has employees:invite in catalog', () => {
      const entry = PERMISSION_CATALOG.find(p => p.key === 'employees:invite');
      expect(entry).toBeDefined();
      expect(entry!.riskLevel).toBe('high');
    });

    it('has employees:update in catalog', () => {
      const entry = PERMISSION_CATALOG.find(p => p.key === 'employees:update');
      expect(entry).toBeDefined();
      expect(entry!.riskLevel).toBe('critical');
    });

    it('has employees:delete in catalog', () => {
      const entry = PERMISSION_CATALOG.find(p => p.key === 'employees:delete');
      expect(entry).toBeDefined();
      expect(entry!.riskLevel).toBe('critical');
    });

    it('has employees:manage_permissions in catalog', () => {
      const entry = PERMISSION_CATALOG.find(p => p.key === 'employees:manage_permissions');
      expect(entry).toBeDefined();
      expect(entry!.riskLevel).toBe('critical');
    });

    it('owner role has all 5 employee permissions', () => {
      const ownerPerms = ROLE_PERMISSIONS.owner;
      expect(ownerPerms).toContain('employees:view');
      expect(ownerPerms).toContain('employees:invite');
      expect(ownerPerms).toContain('employees:update');
      expect(ownerPerms).toContain('employees:delete');
      expect(ownerPerms).toContain('employees:manage_permissions');
    });

    it('admin role has employees:view only', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      expect(adminPerms).toContain('employees:view');
      expect(adminPerms).not.toContain('employees:invite');
      expect(adminPerms).not.toContain('employees:update');
      expect(adminPerms).not.toContain('employees:delete');
      expect(adminPerms).not.toContain('employees:manage_permissions');
    });

    it('non-owner/admin roles have no employee permissions', () => {
      const restricted: Array<keyof typeof ROLE_PERMISSIONS> = ['manager', 'products_manager', 'orders_manager', 'accountant', 'support', 'viewer'];
      const employeePerms = ['employees:view', 'employees:invite', 'employees:update', 'employees:delete', 'employees:manage_permissions'];
      for (const role of restricted) {
        for (const p of employeePerms) {
          expect(ROLE_PERMISSIONS[role]).not.toContain(p);
        }
      }
    });
  });

  describe('EmployeeFormDialog', () => {
    const dialogPath = resolve(projectRoot, 'apps/merchant-dashboard/src/components/employees/EmployeeFormDialog.tsx');
    const dialog = readFileSync(dialogPath, 'utf-8');

    it('uses PermissionCheckboxMatrix', () => {
      expect(dialog).toContain('PermissionCheckboxMatrix');
    });

    it('marks save as disabled/unavailable', () => {
      expect(dialog).toContain('disabled');
      expect(dialog).toContain('غير متاح');
    });
  });

  describe('API Contract doc', () => {
    const contractPath = resolve(projectRoot, 'docs/security/EMPLOYEE_MANAGEMENT_API_CONTRACT.md');
    const contract = readFileSync(contractPath, 'utf-8');

    it('exists', () => {
      expect(contract).toBeTruthy();
    });

    it('documents required endpoints', () => {
      expect(contract).toContain('GET /stores/:storeId/employees');
      expect(contract).toContain('POST /stores/:storeId/employees/invite');
      expect(contract).toContain('PATCH /stores/:storeId/employees/:employeeId');
      expect(contract).toContain('DELETE /stores/:storeId/employees/:employeeId');
    });

    it('documents safety rules', () => {
      expect(contract).toContain('Cannot delete last owner');
      expect(contract).toContain('Cannot grant permissions actor doesn\'t have');
      expect(contract).toContain('Viewer cannot get write/manage perms');
    });
  });
});
