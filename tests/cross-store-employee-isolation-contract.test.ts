// Cross-store employee isolation — source-grep contract.
//
// Confirms that the audit P0 (2026-06-25) tenant-isolation fix is
// fully wired across schema, services, routes, login flow, and the
// new /auth/select-store endpoint. Six classes of defect get checked:
//
//   1. Schema declares the storeId, isActive, revokedAt, revokedBy
//      columns on tenant_users (added by migration 0087).
//   2. EmployeeService.list / findEmployee / invite / revoke filter
//      every read and every write by the caller's store scope.
//   3. EmployeeService.update / revoke modify the MEMBERSHIP's
//      `isActive`, NOT the global `users.isActive` (the latter
//      would log the user out of every other tenant they belong to).
//   4. PermissionService.findMembership scopes by storeId too.
//   5. AuthFlowService.login refuses to auto-pick a tenant for users
//      with multiple memberships — returns `tenant_selection_required`.
//   6. The /auth/select-store endpoint mints a JWT only after
//      verifying (userId, storeId) really map to an active membership
//      whose tenantId matches the store's tenantId.
//
// Audit reference: P0 — Employees cross-store leak (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA = readFileSync(
  resolve(__dirname, '../packages/db/src/schema/tenant_users.ts'),
  'utf-8',
);
const MIGRATION = readFileSync(
  resolve(__dirname, '../packages/db/src/migrations/0087_tenant_users_store_scope.sql'),
  'utf-8',
);
const EMPLOYEE_SVC = readFileSync(
  resolve(__dirname, '../packages/auth-core/src/employee-service.ts'),
  'utf-8',
);
const PERMISSION_SVC = readFileSync(
  resolve(__dirname, '../packages/auth-core/src/permission-service.ts'),
  'utf-8',
);
const COUNT_HELPER = readFileSync(
  resolve(__dirname, '../packages/auth-core/src/tenant-owners-helper.ts'),
  'utf-8',
);
const AUTH_FLOW = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/auth-flow.ts'),
  'utf-8',
);
const AUTH_ROUTE = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/auth.ts'),
  'utf-8',
);
const EMPLOYEE_ROUTE = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/employees.ts'),
  'utf-8',
);

describe('Schema — tenant_users gains store scope + membership flags', () => {
  it('declares storeId nullable FK to stores', () => {
    expect(SCHEMA).toMatch(/storeId:\s*integer\(['"]store_id['"]\)\.references\(\(\)\s*=>\s*stores\.id\)/);
  });

  it('declares isActive (NOT NULL default true)', () => {
    expect(SCHEMA).toMatch(/isActive:\s*boolean\(['"]is_active['"]\)\.notNull\(\)\.default\(true\)/);
  });

  it('declares revokedAt + revokedByUserId', () => {
    expect(SCHEMA).toMatch(/revokedAt:\s*timestamp\(['"]revoked_at['"]\)/);
    expect(SCHEMA).toMatch(/revokedByUserId:\s*integer\(['"]revoked_by_user_id['"]\)/);
  });

  it('unique key includes storeId', () => {
    expect(SCHEMA).toMatch(/unique\(\)\.on\(table\.tenantId,\s*table\.storeId,\s*table\.userId\)/);
  });
});

describe('Migration 0087 — tenant_users store scope + revocation columns', () => {
  it('adds store_id with FK + backfill for single-store tenants', () => {
    expect(MIGRATION).toMatch(/ADD COLUMN IF NOT EXISTS "store_id" integer/);
    expect(MIGRATION).toMatch(/FOREIGN KEY \("store_id"\) REFERENCES "stores"\("id"\)/);
    expect(MIGRATION).toMatch(/SELECT s\.id FROM "stores" s/);
  });

  it('swaps the unique constraint to (tenant_id, store_id, user_id)', () => {
    expect(MIGRATION).toMatch(/UNIQUE NULLS NOT DISTINCT \("tenant_id", "store_id", "user_id"\)/);
  });

  it('adds is_active + revoked_at + revoked_by_user_id', () => {
    expect(MIGRATION).toMatch(/ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE/);
    expect(MIGRATION).toMatch(/ADD COLUMN IF NOT EXISTS "revoked_at" timestamp/);
    expect(MIGRATION).toMatch(/ADD COLUMN IF NOT EXISTS "revoked_by_user_id" integer REFERENCES users\(id\)/);
  });
});

describe('EmployeeService — store-scoped reads + writes', () => {
  it('defines storeScopeClause private helper', () => {
    expect(EMPLOYEE_SVC).toMatch(/private storeScopeClause\(/);
    expect(EMPLOYEE_SVC).toMatch(/tenantUsers\.storeId\}\s+IS NULL OR/);
  });

  it('list() applies the store scope clause', () => {
    const listIdx = EMPLOYEE_SVC.indexOf('async list(');
    const inviteIdx = EMPLOYEE_SVC.indexOf('async invite(', listIdx);
    const block = EMPLOYEE_SVC.slice(listIdx, inviteIdx);
    expect(block).toMatch(/this\.storeScopeClause\(ctx\)/);
  });

  it('findEmployee() applies the store scope clause', () => {
    const idx = EMPLOYEE_SVC.indexOf('private async findEmployee');
    const nextIdx = EMPLOYEE_SVC.indexOf('async list(', idx);
    const block = EMPLOYEE_SVC.slice(idx, nextIdx);
    expect(block).toMatch(/this\.storeScopeClause\(ctx\)/);
  });

  it('revoke() applies the store scope clause + defensive tenantId WHERE', () => {
    const block = EMPLOYEE_SVC.slice(EMPLOYEE_SVC.indexOf('async revoke('));
    expect(block.slice(0, 2500)).toMatch(/this\.storeScopeClause\(ctx\)/);
    // Defensive tenant-scoped UPDATE on the soft-revoke.
    expect(block.slice(0, 2500)).toMatch(/eq\(s\.tenantUsers\.tenantId,\s*ctx\.tenantId\)/);
  });

  it('invite() scopes the duplicate-link check by store', () => {
    const block = EMPLOYEE_SVC.slice(EMPLOYEE_SVC.indexOf('async invite('));
    expect(block.slice(0, 1200)).toMatch(/this\.storeScopeClause\(ctx\)/);
  });

  it('invite() persists storeId on the new tenant_users row', () => {
    expect(EMPLOYEE_SVC).toMatch(/storeId:\s*ctx\.storeId\s*\?\?\s*null/);
  });
});

describe('EmployeeService — per-membership isActive (no global side-effects)', () => {
  it('update() sets tenant_users.isActive, NOT users.isActive', () => {
    const updateBlock = EMPLOYEE_SVC.slice(
      EMPLOYEE_SVC.indexOf('async update('),
      EMPLOYEE_SVC.indexOf('async revoke('),
    );
    // The buggy line was: `db.update(s.users).set({ isActive: input.isActive })`.
    // It MUST be gone.
    expect(updateBlock).not.toMatch(/\.update\(s\.users\)\.set\(\s*\{\s*isActive:/);
    expect(updateBlock).toMatch(/\.update\(s\.tenantUsers\)/);
    expect(updateBlock).toMatch(/isActive:\s*input\.isActive/);
    expect(updateBlock).toMatch(/revokedAt:/);
    expect(updateBlock).toMatch(/revokedByUserId:/);
  });

  it('revoke() does NOT disable the global user.isActive', () => {
    const revokeBlock = EMPLOYEE_SVC.slice(EMPLOYEE_SVC.indexOf('async revoke('));
    expect(revokeBlock.slice(0, 3000)).not.toMatch(/db\.update\(s\.users\)\.set\(\s*\{\s*isActive:\s*false/);
    // The soft-revoke must update tenant_users.isActive instead.
    expect(revokeBlock.slice(0, 3000)).toMatch(/\.update\(s\.tenantUsers\)/);
    expect(revokeBlock.slice(0, 3000)).toMatch(/isActive:\s*false/);
  });

  it('list/findEmployee read tenant_users.isActive, not users.isActive', () => {
    expect(EMPLOYEE_SVC).toMatch(/isActive:\s*s\.tenantUsers\.isActive/);
  });
});

describe('PermissionService.findMembership — store-scoped', () => {
  it('the membership lookup filters on storeId', () => {
    const block = PERMISSION_SVC.slice(PERMISSION_SVC.indexOf('async findMembership'));
    expect(block.slice(0, 1500)).toMatch(/tenantUsers\.storeId\}\s+IS NULL OR/);
    expect(block.slice(0, 1500)).toMatch(/tenantUsers\.storeId\}\s*=\s*\$\{ctx\.storeId\}/);
  });
});

describe('countTenantOwners — store-scoped', () => {
  it('accepts an optional storeId parameter', () => {
    expect(COUNT_HELPER).toMatch(/storeId\?\:\s*number/);
  });

  it('cross-store admins (storeId IS NULL) count toward every store', () => {
    expect(COUNT_HELPER).toMatch(/tenantUsers\.storeId\}\s+IS NULL OR/);
  });
});

describe('Routes — buildCtx pulls storeId from URL path, not auth.activeStoreId', () => {
  it('employees route reads storeId from the URL param', () => {
    expect(EMPLOYEE_ROUTE).toMatch(/c\.req\.param\(['"]storeId['"]\)/);
  });
});

describe('AuthFlowService.login — multi-membership safe', () => {
  it('reads ALL memberships (no .limit(1)) before deciding', () => {
    const block = AUTH_FLOW.slice(
      AUTH_FLOW.indexOf('async login('),
      AUTH_FLOW.indexOf('async selectStore('),
    );
    // The fix removes the legacy `.limit(1)` from the tenantUsers
    // read in login. Look at the membership-load block and confirm
    // no `.limit(1)` chained after it.
    const tuIdx = block.indexOf('from(s.tenantUsers)');
    expect(tuIdx).toBeGreaterThan(0);
    const surroundings = block.slice(tuIdx, tuIdx + 600);
    expect(surroundings).not.toMatch(/\.limit\(1\)/);
  });

  it('returns tenant_selection_required when length > 1', () => {
    expect(AUTH_FLOW).toMatch(/kind:\s*['"]tenant_selection_required['"]/);
    expect(AUTH_FLOW).toMatch(/memberships:\s*AvailableMembership\[\]/);
  });

  it('the safe membership summary excludes role + email', () => {
    const ifaceBlock = AUTH_FLOW.slice(AUTH_FLOW.indexOf('interface AvailableMembership'));
    expect(ifaceBlock.slice(0, 400)).not.toMatch(/email:/);
    expect(ifaceBlock.slice(0, 400)).not.toMatch(/role:/);
  });

  it('filters out inactive memberships (isActive=false)', () => {
    // The clause appears in the multi-membership read AND the
    // selectStore read. Confirm it exists in the login function
    // body (between async login( and async selectStore().
    const start = AUTH_FLOW.indexOf('async login(');
    const end = AUTH_FLOW.indexOf('async selectStore(');
    const block = AUTH_FLOW.slice(start, end);
    expect(block).toMatch(/eq\(s\.tenantUsers\.isActive,\s*true\)/);
  });
});

describe('AuthFlowService.selectStore — cross-tenant rejection', () => {
  it('verifies the membership tenantId matches the chosen store.tenantId', () => {
    const block = AUTH_FLOW.slice(AUTH_FLOW.indexOf('async selectStore('));
    expect(block.slice(0, 2500)).toMatch(/eq\(s\.tenantUsers\.tenantId,\s*store\.tenantId\)/);
    expect(block.slice(0, 2500)).toMatch(/eq\(s\.tenantUsers\.isActive,\s*true\)/);
  });

  it('refused cross-tenant attempts are audit-logged', () => {
    expect(AUTH_FLOW).toMatch(/login_cross_tenant_rejected/);
  });
});

describe('Route — POST /auth/select-store', () => {
  it('exists and is unauthenticated (no requireAuth wrapper)', () => {
    // The route declaration is BEFORE the path string; walk back to
    // capture the surrounding authRouter.post(...) opening.
    const pathIdx = AUTH_ROUTE.indexOf("'/select-store'");
    expect(pathIdx).toBeGreaterThan(0);
    const before = AUTH_ROUTE.slice(Math.max(0, pathIdx - 400), pathIdx);
    expect(before).toMatch(/authRouter\.post\(/);
    // The route's middleware chain (path → rateLimiter → zValidator
    // → handler) is the next ~200 chars. requireAuth() MUST NOT
    // appear there.
    const window = AUTH_ROUTE.slice(pathIdx, pathIdx + 400);
    expect(window).not.toMatch(/requireAuth\(\)/);
  });

  it('re-verifies the password before minting a JWT', () => {
    const block = AUTH_ROUTE.slice(
      AUTH_ROUTE.indexOf('/select-store'),
      AUTH_ROUTE.indexOf('/select-store') + 4000,
    );
    // Re-uses service.login(...) for credential verification.
    expect(block).toMatch(/service\.login\(/);
  });

  it('login response carries TENANT_SELECTION_REQUIRED for multi-membership', () => {
    expect(AUTH_ROUTE).toMatch(/TENANT_SELECTION_REQUIRED/);
  });
});
