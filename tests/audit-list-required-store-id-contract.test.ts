// AuditLogService.list — required storeId contract.
//
// Audit P0 follow-up (2026-06-25): the previous signature accepted an
// optional storeId. If any caller forgot to pass it, the service
// silently returned all platform audit logs across every store. The
// signature is now non-optional so the TypeScript compiler refuses
// any forgetful caller at build time.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../packages/integration-core/src/audit.ts'),
  'utf-8',
);

describe('AuditLogService — required storeId', () => {
  it('list() signature is `list(storeId: number, opts?: AuditListOptions)`', () => {
    expect(SRC).toMatch(/async list\(storeId:\s*number,\s*opts\?:\s*AuditListOptions\)/);
    // The historic optional form (`storeId?: number`) must be gone.
    expect(SRC).not.toMatch(/async list\(storeId\?:\s*number/);
  });

  it('buildConditions() also takes a required storeId', () => {
    expect(SRC).toMatch(/private buildConditions\(storeId:\s*number,/);
    expect(SRC).not.toMatch(/private buildConditions\(storeId\?:\s*number/);
  });

  it('buildConditions ALWAYS pushes the storeId condition (no truthiness gate)', () => {
    // The historic gate `if (storeId) conditions.push(...)` made the
    // whole defence opt-in. Now the eq(storeId) clause is always the
    // first condition.
    expect(SRC).not.toMatch(/if\s*\(storeId\)\s*conditions\.push\(eq\(s\.auditLogs\.storeId/);
    expect(SRC).toMatch(/const conditions: SQL\[\] = \[eq\(s\.auditLogs\.storeId,\s*storeId\)\]/);
  });
});
