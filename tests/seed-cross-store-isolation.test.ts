// Seed data cross-store isolation — source-grep contract.
//
// Four invariants verified (matching the Audit P3 requirements):
//
//   A. haa-demo employees list does NOT include merchant.perfumes
//      → seed assigns each merchant to its own store; EmployeeService
//        scopes list() by storeScopeClause (tested separately).
//
//   B. demo-perfumes employees list does NOT include merchant.haa-demo
//      → same mechanism — different store_id, different scope.
//
//   C. Each session carries the correct store_id
//      → products route reads storeId from the URL param, already
//        verified by requireStoreAccess(); ProductsService.list()
//        always filters by eq(products.storeId, storeId).
//
//   D. Each account sees only its own store's products
//      → ProductsService passes the caller's storeId as the first
//        argument to every query; all WHERE clauses include storeId.
//
// Background (Seed Bug, 2026-06-25 fix in commit 32a9cb46):
//   The old seed put both merchants in tenant_users pointing to
//   haa-demo's store_id.  merchant.perfumes appeared in haa-demo's
//   Employees page.  The fix: index.ts only inserts haaDemoMerchant;
//   perfume-demo.ts creates demo-perfumes store and inserts
//   perfumeDemoMerchant scoped to that store.
//
// These are static source-grep checks — no DB connection required.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEED_INDEX = readFileSync(
  resolve(__dirname, '../packages/db/src/seed/index.ts'),
  'utf-8',
);

const SEED_PERFUME = readFileSync(
  resolve(__dirname, '../packages/db/src/seed/demo/perfume-demo.ts'),
  'utf-8',
);

const SEED_HAA_DEMO = readFileSync(
  resolve(__dirname, '../packages/db/src/seed/demo/haa-demo.ts'),
  'utf-8',
);

// ────────────────────────────────────────────────────────────────────
// Helper: extract the tenant_users insert block from a source file.
// Returns the slice of source from the first s.tenantUsers insert
// up to the next top-level await / closing brace section (~2 kB).
// ────────────────────────────────────────────────────────────────────
function tenantUsersInsertBlock(src: string): string {
  const idx = src.indexOf('insert(s.tenantUsers)');
  if (idx === -1) return '';
  return src.slice(idx, idx + 2000);
}

describe('Seed index.ts — merchant scoping (haa-demo only)', () => {
  it('inserts haaDemoMerchant into tenant_users (by variable name)', () => {
    const block = tenantUsersInsertBlock(SEED_INDEX);
    // The only tenantUsers row must reference haaDemoMerchant.
    expect(block).toMatch(/haaDemoMerchant\.id/);
  });

  it('does NOT insert perfumeDemoMerchant into tenant_users', () => {
    // Find all tenantUsers insert blocks — there must be exactly one.
    const firstIdx = SEED_INDEX.indexOf('insert(s.tenantUsers)');
    expect(firstIdx).toBeGreaterThan(0);
    // Confirm there is no second insert referencing perfumeDemoMerchant.
    const afterFirst = SEED_INDEX.slice(firstIdx + 1);
    const secondIdx = afterFirst.indexOf('insert(s.tenantUsers)');
    // Either no second insert exists, or any second insert does NOT
    // reference perfumeDemoMerchant by name.
    if (secondIdx !== -1) {
      const secondBlock = afterFirst.slice(secondIdx, secondIdx + 500);
      expect(secondBlock).not.toMatch(/perfumeDemoMerchant\.id/);
    }
  });

  it('tenant_users row uses the haa-demo store variable (not perfume store)', () => {
    const block = tenantUsersInsertBlock(SEED_INDEX);
    // storeId must be `store.id` where `store` is the haa-demo store.
    // The perfume store is created in perfume-demo.ts, not here.
    expect(block).toMatch(/storeId:\s*store\.id/);
    expect(block).not.toMatch(/perfumeStore/);
    expect(block).not.toMatch(/perfume.*storeId/i);
  });

  it('comment confirms perfume merchant membership lives in perfume-demo.ts', () => {
    // Comment may span multiple lines — use [\s\S] to cross line boundaries.
    expect(SEED_INDEX).toMatch(/demo-perfumes merchant is created in[\s\S]{0,200}perfume-demo/i);
  });
});

describe('Seed perfume-demo.ts — independent store + scoped membership', () => {
  it('creates a store with slug demo-perfumes (not haa-demo)', () => {
    expect(SEED_PERFUME).toMatch(/DEMO_SLUG\s*=\s*['"]demo-perfumes['"]/);
    // Confirm there is no haa-demo slug reference inside the store insert.
    const insertStoreIdx = SEED_PERFUME.indexOf("insert(s.stores)");
    if (insertStoreIdx !== -1) {
      const block = SEED_PERFUME.slice(insertStoreIdx, insertStoreIdx + 800);
      expect(block).not.toMatch(/['"]haa-demo['"]/);
    }
  });

  it('inserts perfumeDemoMerchant into tenant_users', () => {
    const block = tenantUsersInsertBlock(SEED_PERFUME);
    expect(block).toMatch(/perfumeDemoMerchant\.id/);
  });

  it('scopes the membership to its OWN store (store.id), not a hard-coded id', () => {
    const block = tenantUsersInsertBlock(SEED_PERFUME);
    // storeId must reference the local `store` variable (demo-perfumes store).
    expect(block).toMatch(/storeId:\s*store\.id/);
    // Must NOT hard-code storeId: 1 (haa-demo's id in typical seed DBs).
    expect(block).not.toMatch(/storeId:\s*1[^0-9]/);
  });

  it('does NOT reference haa-demo slug when inserting tenant_users', () => {
    // Expand the search to all tenantUsers insert text in the file.
    let src = SEED_PERFUME;
    let idx = src.indexOf('insert(s.tenantUsers)');
    while (idx !== -1) {
      const snippet = src.slice(idx, idx + 500);
      expect(snippet).not.toMatch(/haa-demo/);
      src = src.slice(idx + 1);
      idx = src.indexOf('insert(s.tenantUsers)');
    }
  });

  it('checks for existing membership before inserting (idempotent)', () => {
    // The fix must be idempotent to avoid duplicate-key errors on re-seed.
    expect(SEED_PERFUME).toMatch(/existingMembership/);
    expect(SEED_PERFUME).toMatch(/if\s*\(\s*!existingMembership\s*\)/);
  });
});

describe('Seed haa-demo.ts — does not touch tenant_users', () => {
  it('contains no tenant_users insert', () => {
    expect(SEED_HAA_DEMO).not.toMatch(/insert\(s\.tenantUsers\)/);
  });
});

describe('Cross-file isolation invariant — two distinct stores, two distinct memberships', () => {
  it('each seed file operates on a different store slug', () => {
    // index.ts → haa-demo
    expect(SEED_INDEX).toMatch(/slug:\s*['"]haa-demo['"]/);
    // perfume-demo.ts → demo-perfumes
    expect(SEED_PERFUME).toMatch(/slug:\s*(DEMO_SLUG|['"]demo-perfumes['"]]?)/);
    // The two slugs must not appear in each other's store-create calls.
    const indexStoreBlock = SEED_INDEX.slice(
      SEED_INDEX.indexOf("insert(s.stores)"),
      SEED_INDEX.indexOf("insert(s.stores)") + 800,
    );
    expect(indexStoreBlock).not.toMatch(/demo-perfumes/);
  });

  it('no seed file creates a haa-demo-scoped row for the perfume merchant', () => {
    // In index.ts, after the haa-demo store insert, any tenant_users
    // rows must NOT reference both haaDemoStoreSlug and perfumeDemoMerchant.
    const combined = SEED_INDEX + SEED_HAA_DEMO;
    // Look for the suspicious pattern: insert into tenantUsers + perfumeDemoMerchant.
    expect(combined).not.toMatch(/insert\(s\.tenantUsers\)[\s\S]{0,500}perfumeDemoMerchant\.id/);
  });
});

// ────────────────────────────────────────────────────────────────────
// Invariant A + B — EmployeeService.list() isolation at code level
//
// These tests confirm the EmployeeService will never leak employees
// across store boundaries, making the Employees-page isolation hold
// for BOTH haa-demo and demo-perfumes stores.
// ────────────────────────────────────────────────────────────────────

const EMPLOYEE_SVC = readFileSync(
  resolve(__dirname, '../packages/auth-core/src/employee-service.ts'),
  'utf-8',
);

describe('Invariant A — haa-demo employees list excludes perfumes merchant', () => {
  it('list() scopes by storeScopeClause, so only store_id=haa-demo rows are returned', () => {
    // This is the code guarantee: any call to list({storeId: haa_demo_id})
    // will filter WHERE (store_id IS NULL OR store_id = haa_demo_id).
    // A row with store_id = demo_perfumes_id is silently excluded.
    const listStart = EMPLOYEE_SVC.indexOf('async list(');
    const listEnd = EMPLOYEE_SVC.indexOf('async invite(', listStart);
    const listBlock = EMPLOYEE_SVC.slice(listStart, listEnd);
    expect(listBlock).toMatch(/storeScopeClause/);
    expect(listBlock).toMatch(/eq\(s\.tenantUsers\.tenantId/);
  });

  it('storeScopeClause uses the ctx.storeId passed by the caller', () => {
    const clauseStart = EMPLOYEE_SVC.indexOf('private storeScopeClause(');
    const clauseEnd = EMPLOYEE_SVC.indexOf('\n  }', clauseStart) + 4;
    const clauseBlock = EMPLOYEE_SVC.slice(clauseStart, clauseEnd);
    // Must use ctx.storeId (not a hardcoded store id).
    expect(clauseBlock).toMatch(/ctx\.storeId/);
    expect(clauseBlock).toMatch(/IS NULL OR/);
  });
});

describe('Invariant B — demo-perfumes employees list excludes haa-demo merchant', () => {
  it('the same storeScopeClause applies regardless of which store calls list()', () => {
    // storeScopeClause is parameterised by ctx.storeId — if called with
    // demo-perfumes storeId, it filters to that store exclusively.
    // Confirm the clause has no hardcoded store id.
    const clauseBlock = EMPLOYEE_SVC.slice(
      EMPLOYEE_SVC.indexOf('private storeScopeClause('),
      EMPLOYEE_SVC.indexOf('private storeScopeClause(') + 400,
    );
    expect(clauseBlock).not.toMatch(/storeId:\s*\d+/);  // no hardcoded integer
    expect(clauseBlock).not.toMatch(/=\s*1[^0-9]/);     // not = 1 (haa-demo typical id)
  });

  it('EmployeeService route reads storeId from URL path, not JWT activeStoreId', () => {
    const EMPLOYEE_ROUTE = readFileSync(
      resolve(__dirname, '../apps/api/src/routes/employees.ts'),
      'utf-8',
    );
    // buildCtx must use c.req.param('storeId'), not auth.activeStoreId alone.
    expect(EMPLOYEE_ROUTE).toMatch(/c\.req\.param\(['"]storeId['"]\)/);
    // And requireStoreAccess() middleware guards the route before buildCtx runs.
    expect(EMPLOYEE_ROUTE).toMatch(/requireStoreAccess\(\)/);
  });
});

// ────────────────────────────────────────────────────────────────────
// Invariant C — Each session carries the correct store_id
// ────────────────────────────────────────────────────────────────────

const AUTH_FLOW = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/auth-flow.ts'),
  'utf-8',
);

describe('Invariant C — session carries correct store_id', () => {
  it('selectStore() mints JWT with the chosen store.id (not a default or fallback)', () => {
    const selectBlock = AUTH_FLOW.slice(AUTH_FLOW.indexOf('async selectStore('));
    // The JWT must include storeId from the actual store record, not hardcoded.
    expect(selectBlock.slice(0, 3000)).toMatch(/storeId:\s*store\.id/);
  });

  it('selectStore() verifies membership tenantId === store.tenantId before minting', () => {
    // Cross-tenant rejection: cannot mint a token for store owned by another tenant.
    const selectBlock = AUTH_FLOW.slice(AUTH_FLOW.indexOf('async selectStore('));
    expect(selectBlock.slice(0, 3000)).toMatch(/eq\(s\.tenantUsers\.tenantId,\s*store\.tenantId\)/);
  });

  it('selectStore() only proceeds if membership isActive=true', () => {
    const selectBlock = AUTH_FLOW.slice(AUTH_FLOW.indexOf('async selectStore('));
    expect(selectBlock.slice(0, 3000)).toMatch(/eq\(s\.tenantUsers\.isActive,\s*true\)/);
  });
});

// ────────────────────────────────────────────────────────────────────
// Invariant D — Each account sees only its own store's products
// ────────────────────────────────────────────────────────────────────

const PRODUCTS_SVC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/products.ts'),
  'utf-8',
);
const PRODUCTS_ROUTE = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/products.ts'),
  'utf-8',
);
const STOREFRONT_PRODUCTS = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/storefront/products.ts'),
  'utf-8',
);

describe('Invariant D — products are always scoped to caller\'s store', () => {
  it('ProductsService.list() first WHERE condition is eq(products.storeId, storeId)', () => {
    const listStart = PRODUCTS_SVC.indexOf('async list(storeId:');
    const listBlock = PRODUCTS_SVC.slice(listStart, listStart + 800);
    expect(listBlock).toMatch(/eq\(s\.products\.storeId,\s*storeId\)/);
  });

  it('ProductsService.getById() always ANDs eq(products.storeId, storeId)', () => {
    const getByIdBlock = PRODUCTS_SVC.slice(
      PRODUCTS_SVC.indexOf('async getById('),
      PRODUCTS_SVC.indexOf('async getBySlug('),
    );
    expect(getByIdBlock).toMatch(/eq\(s\.products\.storeId,\s*storeId\)/);
  });

  it('merchant products route uses requireAuth + requireStoreAccess before serving', () => {
    expect(PRODUCTS_ROUTE).toMatch(/requireAuth\(\),\s*requireStoreAccess\(\)/);
    // Passes URL storeId to ProductsService — no raw auth.activeStoreId.
    expect(PRODUCTS_ROUTE).toMatch(/c\.req\.param\(['"]storeId['"]\)/);
  });

  it('storefront products route scopes by store.id resolved from slug', () => {
    // The storefront route resolves the store by slug first, then uses
    // store.id in all WHERE clauses — so /s/haa-demo/products only returns
    // haa-demo products, never demo-perfumes products.
    expect(STOREFRONT_PRODUCTS).toMatch(/eq\(s\.products\.storeId,\s*store\.id\)/);
  });
});
