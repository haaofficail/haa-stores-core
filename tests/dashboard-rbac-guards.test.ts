import { describe, expect, it } from 'vitest';
import { PERMISSION_CATALOG } from '@haa/shared';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const sidebarPath = new URL('../apps/merchant-dashboard/src/components/layout/Sidebar.tsx', import.meta.url);
const sidebar = readFileSync(sidebarPath, 'utf-8');

const appPath = new URL('../apps/merchant-dashboard/src/App.tsx', import.meta.url);
const app = readFileSync(appPath, 'utf-8');

const permissionRoutePath = new URL('../apps/merchant-dashboard/src/components/auth/PermissionRoute.tsx', import.meta.url);
const permissionRoute = readFileSync(permissionRoutePath, 'utf-8');

const pagesDirPath = resolve(new URL('..', import.meta.url).pathname, 'apps/merchant-dashboard/src/pages');
const pageFiles = readdirSync(pagesDirPath).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

describe('Dashboard RBAC Pass 2', () => {
  describe('Sidebar permission metadata', () => {
    it('has permission field on every nav item', () => {
      const permissionDeclarations = sidebar.match(/permission:\s*['"][a-z_:.]+['"]/g);
      expect(permissionDeclarations).toBeTruthy();
      expect(permissionDeclarations!.length).toBeGreaterThan(20);
    });

    it('all sidebar permission keys exist in PERMISSION_CATALOG', () => {
      const permissionDeclarations = sidebar.match(/permission:\s*['"]([a-z_:.]+)['"]/g);
      const catalogKeys = new Set(PERMISSION_CATALOG.map(e => e.key));
      const missing: string[] = [];

      for (const decl of permissionDeclarations ?? []) {
        const key = decl.match(/['"]([a-z_:.]+)['"]/)![1];
        if (!catalogKeys.has(key)) missing.push(key);
      }

      expect(missing).toEqual([]);
    });
  });

  describe('Route-level permission guards', () => {
    it('uses PermissionRoute guard on protected routes', () => {
      const guardedRoutes = app.match(/GuardedRoute permission=/g);
      expect(guardedRoutes).toBeTruthy();
      expect(guardedRoutes!.length).toBeGreaterThan(25);
    });

    it('all GuardedRoute permissions exist in PERMISSION_CATALOG', () => {
      const permissionMatches = app.match(/permission="([a-z_:.]+)"/g);
      const catalogKeys = new Set(PERMISSION_CATALOG.map(e => e.key));
      const missing: string[] = [];

      for (const match of permissionMatches ?? []) {
        const key = match.match(/"([a-z_:.]+)"/)![1];
        if (!catalogKeys.has(key)) missing.push(key);
      }

      expect(missing).toEqual([]);
    });

    it('PermissionRoute component uses UnauthorizedState', () => {
      expect(permissionRoute).toContain('UnauthorizedState');
    });
  });

  describe('Action button guarding', () => {
    it('at least 15 page files have PermissionGate import', () => {
      let count = 0;
      for (const file of pageFiles) {
        const content = readFileSync(resolve(pagesDirPath, file), 'utf-8');
        if (
          content.includes("from '@/lib/permissions'") ||
          content.includes("from '../../lib/permissions'")
        ) {
          count++;
        }
      }
      expect(count).toBeGreaterThanOrEqual(15);
    });
  });
});
