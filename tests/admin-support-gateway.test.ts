import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf-8');

const PAGE_PATH = 'apps/admin-dashboard/src/pages/SupportGateway.tsx';
const APP_PATH = 'apps/admin-dashboard/src/App.tsx';
const API_CLIENT_PATH = 'apps/admin-dashboard/src/lib/api.ts';
const ADMIN_ROUTE_PATH = 'apps/api/src/routes/admin/support-gateway.ts';
const ADMIN_INDEX_PATH = 'apps/api/src/routes/admin/index.ts';
const ADMIN_SERVICE_PATH = 'apps/api/src/services/admin-support-gateway.ts';
const PERMISSIONS_PATH = 'packages/shared/src/permissions.ts';

describe('Admin Support Gateway visibility and safety', () => {
  it('adds a dedicated admin support gateway page', () => {
    expect(existsSync(resolve(ROOT, PAGE_PATH))).toBe(true);
    const src = read(PAGE_PATH);
    expect(src).toContain('export default function SupportGateway');
    expect(src).toContain('بوابة الدعم');
    expect(src).toContain('AdminEmptyState');
    expect(src).toContain('ملف التاجر');
  });

  it('registers the page in admin nav and guards the route with an admin permission', () => {
    const app = read(APP_PATH);
    expect(app).toContain("import('./pages/SupportGateway')");
    expect(app).toContain('/support-gateway|بوابة الدعم|Headphones|support.gateway.read');
    expect(app).toContain('path="/support-gateway"');
    expect(app).toContain('permission="support.gateway.read"');
  });

  it('defines an admin permission instead of reusing merchant support permissions', () => {
    const permissions = read(PERMISSIONS_PATH);
    expect(permissions).toContain("key: 'support.gateway.read'");
    expect(permissions).toContain("category: 'platform_support'");
    expect(permissions).toContain('بدون كشف رموز الوصول');
  });

  it('exposes a typed admin API client for support gateway tickets', () => {
    const api = read(API_CLIENT_PATH);
    expect(api).toContain('export interface AdminSupportTicket');
    expect(api).toContain('export interface AdminSupportGatewayPage');
    expect(api).toContain('getSupportGatewayTickets');
    expect(api).toContain('/admin/support-gateway/tickets');
  });

  it('mounts a read-only admin endpoint with support.gateway.read', () => {
    const route = read(ADMIN_ROUTE_PATH);
    const index = read(ADMIN_INDEX_PATH);
    expect(route).toContain('listSupportGatewayTickets');
    expect(route).toContain('listSupportGatewayTicketsQuerySchema');
    expect(route).not.toContain("from 'drizzle-orm'");
    expect(index).toContain('/support-gateway/tickets');
    expect(index).toContain("requireAdminPermission('support.gateway.read')");
    expect(index).not.toContain("requireAdminPermission('support:update')");
  });

  it('does not expose customer support access tokens in the admin read model', () => {
    const route = read(ADMIN_ROUTE_PATH);
    const service = read(ADMIN_SERVICE_PATH);
    expect(route).not.toContain('accessToken:');
    expect(service).not.toContain('accessToken:');
    expect(service).not.toContain('s.supportTickets.accessToken');
    expect(service).toContain('messagePreview');
  });
});
