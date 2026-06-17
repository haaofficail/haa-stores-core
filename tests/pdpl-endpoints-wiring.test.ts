// Wiring test for TASK-0034 sub-item 8 (PDPL endpoints).
//
// Saudi PDPL (Personal Data Protection Law) requires:
//   - Right to data portability: GET /api/merchant/data-export
//   - Right to erasure: DELETE /api/merchant/account
//
// This test asserts the structural pieces are in place.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}

describe('PDPL endpoints (TASK-0034 sub-item 8)', () => {
  it('merchant-data.ts route file exists', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'apps/api/src/routes/merchant-data.ts'))).toBe(true);
  });

  it('merchant-data.ts exports the router', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/export\s*\{[^}]*merchantDataRouter[^}]*\}/);
  });

  it('merchant-data.ts defines GET /data-export (right to portability)', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/merchantDataRouter\.get\(\s*['"]\/data-export['"]/);
  });

  it('merchant-data.ts defines DELETE /account (right to erasure)', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/merchantDataRouter\.delete\(\s*['"]\/account['"]/);
  });

  it('data export returns the full data shape (store, products, orders, customers, wallet)', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/s\.stores/);
    expect(file).toMatch(/s\.products/);
    expect(file).toMatch(/s\.orders/);
    expect(file).toMatch(/s\.orderItems/);
    expect(file).toMatch(/s\.customers/);
    expect(file).toMatch(/s\.walletEntries/);
    expect(file).toMatch(/s\.storeBillingSettings/);
  });

  it('account deletion performs a soft delete (isActive=false, status=deactivated)', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/isActive:\s*false/);
    expect(file).toMatch(/status:\s*['"]deactivated['"]/);
  });

  it('account deletion records an audit log entry', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/audit\.record\(/);
    expect(file).toMatch(/action:\s*['"]store_deactivated['"]/);
  });

  it('account deletion returns a retention period + hard-delete date', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/retentionDays/);
    expect(file).toMatch(/hardDeleteAt/);
  });

  it('both endpoints require auth + store access + settings:update permission', () => {
    const file = read('apps/api/src/routes/merchant-data.ts');
    expect(file).toMatch(/requireAuth\(\)/);
    expect(file).toMatch(/requireStoreAccess\(\)/);
    // Both endpoints use settings:update (not settings:manage — that
    // permission name doesn't exist; settings:update is the closest
    // match for "manage this store's settings").
    const matches = file.match(/requirePermission\(['"]settings:update['"]\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(2);
  });

  it('AuditAction union includes store_deactivated (PDPL)', () => {
    const types = read('packages/shared/src/types/orders.ts');
    expect(types).toMatch(/'store_deactivated'/);
  });

  it('AUDIT_ACTION_LABELS has Arabic label for store_deactivated', () => {
    const audit = read('packages/shared/src/types/audit.ts');
    expect(audit).toMatch(/store_deactivated:\s*['"]/);
  });

  it('merchantDataRouter is mounted in apps/api/src/index.ts', () => {
    const index = read('apps/api/src/index.ts');
    expect(index).toMatch(/import\s*\{[^}]*merchantDataRouter[^}]*\}\s*from\s*['"]\.\/routes\/merchant-data\.js['"]/);
    expect(index).toMatch(/app\.route\(['"]\/merchant\/:storeId['"]\s*,\s*merchantDataRouter\)/);
  });
});
