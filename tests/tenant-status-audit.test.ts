// Tenant status change audit log — F-QA-B-004.
//
// Locks the rule that PATCH /admin/tenants/:id/status writes an audit
// entry (action='tenant_status_changed') on every effective change, and
// returns 404 when the tenant doesn't exist. A no-op (same status)
// must NOT produce an audit entry — that keeps the log signal clean.
//
// Static-grep style: the test reads the source file and checks for
// the structural commitments. A behavioural test would need a live
// PostgreSQL fixture which lives in the integration suite.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/tenants-stores.ts'),
  'utf-8',
);

// Find the `status:` handler body. We slice from the handler signature
// to the closing brace of the enclosing routes object so the assertions
// only run against this one handler.
const handlerStart = SRC.indexOf('status: async (c: any) =>');
const tenantsBlockEnd = SRC.indexOf('// ── /stores', handlerStart);
const handlerSlice = SRC.slice(handlerStart, tenantsBlockEnd);

describe('Tenant status change audit log (F-QA-B-004)', () => {
  it('selects the existing tenant before updating', () => {
    expect(handlerSlice).toMatch(/\.select\(/);
    expect(handlerSlice).toMatch(/from\(s\.tenants\)/);
    expect(handlerSlice).toMatch(/where\(eq\(s\.tenants\.id, id\)\)/);
  });

  it('returns 404 when the tenant does not exist', () => {
    expect(handlerSlice).toMatch(/!existing/);
    expect(handlerSlice).toMatch(/NOT_FOUND/);
    expect(handlerSlice).toMatch(/\b404\b/);
  });

  it('short-circuits without audit when status is unchanged', () => {
    expect(handlerSlice).toMatch(/existing\.status === status/);
  });

  it('records an audit entry on an effective change', () => {
    expect(handlerSlice).toMatch(/new AuditLogService\(\)/);
    expect(handlerSlice).toMatch(/tenant_status_changed/);
    expect(handlerSlice).toMatch(/entityType: 'tenant'/);
  });

  it('captures both oldValue and newValue', () => {
    expect(handlerSlice).toMatch(/oldValue: \{ status: existing\.status \}/);
    expect(handlerSlice).toMatch(/newValue: \{ status \}/);
  });

  it('forwards ipAddress + userAgent on the audit call', () => {
    expect(handlerSlice).toMatch(/x-forwarded-for/);
    expect(handlerSlice).toMatch(/user-agent/);
  });
});
