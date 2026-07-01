// P1-9 audit fix — /admin/payments and /admin/audit used to hard-cap at
// 100-200 rows with no page/limit params and no total count, silently
// truncating without any indicator. Also discovered while fixing this:
// the admin-dashboard's /audit page had NO tenantId/storeId filter UI
// but always called the endpoint unscoped, and the backend returned an
// empty array whenever both were absent — the page has always rendered
// zero rows. Both now mirror the page/limit/offset/total/totalPages
// contract already established for /marketplace/products.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TENANTS_STORES = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/tenants-stores.ts'),
  'utf-8',
);
const OPERATIONS = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/operations.ts'),
  'utf-8',
);
const PAYMENTS_PAGE = readFileSync(
  resolve(__dirname, '../apps/admin-dashboard/src/pages/Payments.tsx'),
  'utf-8',
);
const AUDIT_PAGE = readFileSync(
  resolve(__dirname, '../apps/admin-dashboard/src/pages/AuditLogs.tsx'),
  'utf-8',
);

describe('/admin/payments — server-side pagination', () => {
  it('paymentsRoute reads page/limit query params and returns a total', () => {
    const body = TENANTS_STORES.slice(TENANTS_STORES.indexOf('export async function paymentsRoute'));
    const routeBody = body.slice(0, body.indexOf('\n}\n'));
    expect(routeBody).toMatch(/c\.req\.query\('page'\)/);
    expect(routeBody).toMatch(/c\.req\.query\('limit'\)/);
    expect(routeBody).toMatch(/totalPages:/);
  });

  it('no longer silently hard-caps at a fixed 100/200 with no params', () => {
    const body = TENANTS_STORES.slice(TENANTS_STORES.indexOf('export async function paymentsRoute'));
    const routeBody = body.slice(0, body.indexOf('\n}\n'));
    expect(routeBody).not.toMatch(/getAdminPaymentRows\(storeId \? Number\(storeId\) : undefined, storeId \? 100 : 200\)/);
  });
});

describe('/admin/audit — server-side pagination + unscoped access fix', () => {
  it('auditRoute no longer returns empty when both tenantId and storeId are absent', () => {
    const body = OPERATIONS.slice(OPERATIONS.indexOf('export async function auditRoute'));
    const routeBody = body.slice(0, body.indexOf('\n}\n'));
    expect(routeBody).not.toMatch(/if \(!tenantId && !storeId\)/);
  });

  it('auditRoute reads page/limit query params and returns a total', () => {
    const body = OPERATIONS.slice(OPERATIONS.indexOf('export async function auditRoute'));
    const routeBody = body.slice(0, body.indexOf('\n}\n'));
    expect(routeBody).toMatch(/c\.req\.query\('page'\)/);
    expect(routeBody).toMatch(/c\.req\.query\('limit'\)/);
    expect(routeBody).toMatch(/totalPages:/);
  });
});

describe('admin-dashboard Payments/AuditLogs pages — real server pagination wired', () => {
  it('Payments.tsx sends page state to the API and renders TablePager off the server total', () => {
    expect(PAYMENTS_PAGE).toMatch(/adminApi\.getPayments\(\{[\s\S]{0,80}page,[\s\S]{0,80}\}\)/);
    expect(PAYMENTS_PAGE).toMatch(/totalPages=\{totalPages\}/);
    expect(PAYMENTS_PAGE).not.toMatch(/from '\.\.\/lib\/useTableControls'/);
  });

  it('AuditLogs.tsx sends page state to the API and renders TablePager off the server total', () => {
    expect(AUDIT_PAGE).toMatch(/adminApi\.getAuditLogs\(\{[\s\S]{0,40}page,[\s\S]{0,40}\}\)/);
    expect(AUDIT_PAGE).toMatch(/totalPages=\{totalPages\}/);
    expect(AUDIT_PAGE).not.toMatch(/from '\.\.\/lib\/useTableControls'/);
  });
});
