import { describe, expect, it } from 'vitest';
import {
  PERMISSION_CATALOG,
  PERMISSION_PRESETS,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
} from '@haa/shared';
import type { UserRole } from '@haa/shared';

const HIGH_RISK_ACTIONS = ['write', 'delete', 'export', 'import', 'manage', 'invite', 'revoke', 'create'] as const;

function isHighRisk(key: string): boolean {
  const action = key.split(':')[1] ?? key.split('.')[1] ?? '';
  return HIGH_RISK_ACTIONS.some(a => action.startsWith(a));
}

describe('RBAC Permission Catalog Integrity', () => {
  describe('Catalog structure', () => {
    it('every catalog entry has all required fields', () => {
      for (const entry of PERMISSION_CATALOG) {
        expect(entry.key).toBeDefined();
        expect(entry.labelAr).toBeDefined();
        expect(entry.descriptionAr).toBeDefined();
        expect(entry.category).toBeDefined();
        expect(entry.riskLevel).toMatch(/^(low|medium|high|critical)$/);
        expect(Array.isArray(entry.recommendedForRoles)).toBe(true);
      }
    });

    it('no duplicate keys in PERMISSION_CATALOG', () => {
      const keys = PERMISSION_CATALOG.map(e => e.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    });
  });

  describe('ROLE_PERMISSIONS consistency', () => {
    const allRoleKeys = new Set<string>();
    for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
      for (const p of ROLE_PERMISSIONS[role]) {
        allRoleKeys.add(p);
      }
    }

    it('every permission in ROLE_PERMISSIONS exists in PERMISSION_CATALOG', () => {
      const catalogKeys = new Set(PERMISSION_CATALOG.map(e => e.key));
      const missing: string[] = [];
      for (const key of allRoleKeys) {
        if (!catalogKeys.has(key)) missing.push(key);
      }
      expect(missing).toEqual([]);
    });

    it('no duplicate keys within any single role', () => {
      for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
        const unique = new Set(perms);
        expect(unique.size, `${role} has duplicates`).toBe(perms.length);
      }
    });

    it('getPermissionsForRole returns correct permissions for each role', () => {
      for (const role of Object.keys(ROLE_PERMISSIONS) as UserRole[]) {
        const expected = ROLE_PERMISSIONS[role];
        const actual = getPermissionsForRole(role);
        expect(actual).toEqual(expected);
      }
    });

    it('getPermissionsForRole returns empty array for unknown role', () => {
      expect(getPermissionsForRole('unknown' as UserRole)).toEqual([]);
    });
  });

  describe('Owner role', () => {
    const ownerPerms = new Set(ROLE_PERMISSIONS.owner);

    it('has all permissions from catalog', () => {
      const missing = PERMISSION_CATALOG
        .map(e => e.key)
        .filter(k => !ownerPerms.has(k));
      expect(missing).toEqual([]);
    });
  });

  describe('Viewer role restrictions', () => {
    const viewerPerms = new Set(ROLE_PERMISSIONS.viewer);

    it('does not have write/delete/manage/export/create permissions', () => {
      const violations = PERMISSION_CATALOG
        .filter(e => isHighRisk(e.key) && viewerPerms.has(e.key))
        .map(e => e.key);
      expect(violations).toEqual([]);
    });
  });

  describe('Warehouse staff role', () => {
    const warehousePerms = new Set(ROLE_PERMISSIONS.warehouse_staff);

    it('has only the operational permissions needed for warehouse fulfillment', () => {
      expect([...warehousePerms]).toEqual(expect.arrayContaining([
        'dashboard:view',
        'products:read',
        'orders:read',
        'orders:update_status',
        'shipping:manage',
        'storefront:read',
      ]));
    });

    it('does not include employee, finance, reporting, refund, or settings powers', () => {
      const forbidden = [
        'employees:view',
        'employees:invite',
        'employees:update',
        'employees:delete',
        'employees:manage_permissions',
        'wallet:read',
        'wallet:withdraw',
        'reports:read',
        'reports:export',
        'orders:refund',
        'settings:read',
        'settings:update',
      ];
      for (const permission of forbidden) {
        expect(warehousePerms.has(permission)).toBe(false);
      }
    });

    it('has a matching Arabic permission preset', () => {
      const preset = PERMISSION_PRESETS.find(p => p.key === 'warehouse_staff');
      expect(preset?.labelAr).toBe('موظف مستودع');
      expect(preset?.permissionKeys).toEqual(expect.arrayContaining([...warehousePerms]));
    });
  });

  describe('Catalog coverage', () => {
    it('every category has at least one entry', () => {
      const categories = new Set(PERMISSION_CATALOG.map(e => e.category));
      expect(categories.size).toBeGreaterThan(0);
    });

    it('all risk levels are valid', () => {
      const validRiskLevels = ['low', 'medium', 'high', 'critical'];
      for (const entry of PERMISSION_CATALOG) {
        expect(validRiskLevels).toContain(entry.riskLevel);
      }
    });
  });
});
