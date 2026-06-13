import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const employeesPagePath = resolve(projectRoot, 'apps/merchant-dashboard/src/pages/Employees.tsx');
const employeesPage = readFileSync(employeesPagePath, 'utf-8');

const dialogPath = resolve(projectRoot, 'apps/merchant-dashboard/src/components/employees/EmployeeFormDialog.tsx');
const dialog = readFileSync(dialogPath, 'utf-8');

const apiPath = resolve(projectRoot, 'apps/merchant-dashboard/src/lib/api.ts');
const api = readFileSync(apiPath, 'utf-8');

describe('Employee UI → API Wire', () => {
  describe('Employees page', () => {
    it('imports employeesApi', () => {
      expect(employeesPage).toContain('employeesApi');
    });

    it('calls employeesApi.list', () => {
      expect(employeesPage).toContain('employeesApi.list');
    });

    it('calls employeesApi.invite', () => {
      expect(employeesPage).toContain('employeesApi.invite');
    });

    it('calls employeesApi.update', () => {
      expect(employeesPage).toContain('employeesApi.update');
    });

    it('calls employeesApi.remove', () => {
      expect(employeesPage).toContain('employeesApi.remove');
    });

    it('has loading state', () => {
      expect(employeesPage).toContain('جاري تحميل الموظفين');
    });

    it('has empty state', () => {
      expect(employeesPage).toContain('لا يوجد موظفون بعد');
    });

    it('has error state', () => {
      expect(employeesPage).toContain('فشل تحميل');
    });

    it('has refresh button', () => {
      expect(employeesPage).toContain('RefreshCw');
      expect(employeesPage).toContain('تحديث');
    });

    it('no mock data', () => {
      expect(employeesPage).not.toContain('بيانات نموذجية');
      expect(employeesPage).not.toContain('MOCK_EMPLOYEES');
    });
  });

  describe('EmployeeFormDialog', () => {
    it('has onSave callback', () => {
      expect(dialog).toContain('onSave');
    });

    it('handles error state', () => {
      expect(dialog).toContain('حدث خطأ أثناء الحفظ');
    });
  });

  describe('API Client', () => {
    it('has employeesApi.list endpoint', () => {
      expect(api).toContain("request<Employee[]>(`/merchant/${storeId}/employees`)");
    });

    it('has employeesApi.invite endpoint', () => {
      expect(api).toContain("request<Employee>(`/merchant/${storeId}/employees/invite`");
    });

    it('has employeesApi.update endpoint', () => {
      expect(api).toContain("request<Employee>(`/merchant/${storeId}/employees/${employeeId}`");
    });

    it('has employeesApi.remove endpoint', () => {
      expect(api).toContain("request<{ success: true }>(`/merchant/${storeId}/employees/${employeeId}`");
    });
  });
});
