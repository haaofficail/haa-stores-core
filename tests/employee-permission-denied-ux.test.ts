import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const employeesPage = readFileSync(
  resolve(projectRoot, 'apps/merchant-dashboard/src/pages/Employees.tsx'),
  'utf-8',
);

describe('Employees permission-denied and last-owner UX', () => {
  it('uses UnauthorizedState when employees:view is missing', () => {
    expect(employeesPage).toContain("import { UnauthorizedState } from '@/components/ui/UnauthorizedState'");
    expect(employeesPage).toContain("const canViewEmployees = can('employees:view')");
    expect(employeesPage).toMatch(/if\s*\(!canViewEmployees\)\s*\{\s*return\s*\(/);
    expect(employeesPage).toContain('<UnauthorizedState />');
  });

  it('does not fetch employees when the actor lacks employees:view', () => {
    expect(employeesPage).toContain('if (!storeId || !canViewEmployees) return;');
    expect(employeesPage).toContain('if (storeId && canViewEmployees) fetchEmployees();');
  });

  it('explains why the last owner cannot be edited or deleted', () => {
    expect(employeesPage).toContain('آخر مالك');
    expect(employeesPage).toContain('لا يمكن تعديل أو حذف آخر مالك. عيّن مالكًا آخر أولًا.');
    expect(employeesPage).toContain('عيّن مالكًا آخر قبل التعديل أو الحذف.');
  });

  it('keeps permission-management checks readable', () => {
    expect(employeesPage).toContain("const canManageEmployeePermissions = can('employees:manage_permissions')");
    expect(employeesPage).not.toContain("if (can('employees:manage_permissions'))");
  });
});
