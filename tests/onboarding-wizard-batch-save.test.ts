/**
 * Onboarding wizard — atomic batch save (P1 audit Part 1).
 *
 * Original bug: OnboardingWizard saved products in a `for await` loop
 * via `productsApi.create`, with no transaction. If item N failed, the
 * store was left with N-1 stray products and the merchant had no way
 * to roll back. The fix is a single `productsApi.createBatch` call
 * that POSTs all selected items to `/merchant/:storeId/products/batch`,
 * where the API wraps inserts in one Drizzle transaction.
 *
 * Static guards: the wizard MUST not loop `productsApi.create`, the
 * client MUST expose `createBatch`, the API route MUST exist, and the
 * service MUST use `db.transaction`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const WIZARD = resolve(ROOT, 'apps/merchant-dashboard/src/pages/OnboardingWizard.tsx');
const API_CLIENT = resolve(ROOT, 'apps/merchant-dashboard/src/lib/api.ts');
const ROUTE = resolve(ROOT, 'apps/api/src/routes/products.ts');
const SERVICE = resolve(ROOT, 'packages/commerce-core/src/products.ts');

describe('OnboardingWizard atomic batch save (P1 audit)', () => {
  const wizard = readFileSync(WIZARD, 'utf-8');
  const apiClient = readFileSync(API_CLIENT, 'utf-8');
  const route = readFileSync(ROUTE, 'utf-8');
  const service = readFileSync(SERVICE, 'utf-8');

  it('wizard does not call productsApi.create in a loop', () => {
    // The old bug: a `for ... of toSave` block calling productsApi.create.
    // Forbid both: a `for await` block AND any direct productsApi.create
    // call inside handleSaveProducts.
    const handler = wizard.match(/handleSaveProducts\s*=\s*async[\s\S]*?\n\s\s\};/);
    expect(handler, 'handleSaveProducts handler not found').not.toBeNull();
    const body = handler![0];
    expect(body).not.toMatch(/for\s*\(\s*const[\s\S]*?productsApi\.create\(/);
    expect(body).not.toMatch(/for\s+await[\s\S]*?productsApi\.create\(/);
    expect(body).not.toContain('productsApi.create(storeId, p)');
  });

  it('wizard calls productsApi.createBatch exactly once with toSave', () => {
    expect(wizard).toContain('productsApi.createBatch(storeId, toSave)');
    // Single call site (no accidental double-fire).
    const matches = wizard.match(/productsApi\.createBatch\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('productsApi client exposes createBatch hitting /products/batch', () => {
    expect(apiClient).toMatch(/createBatch:\s*\(storeId:\s*number,\s*items:\s*any\[\]\)/);
    expect(apiClient).toMatch(/\/merchant\/\$\{storeId\}\/products\/batch/);
    expect(apiClient).toMatch(/method:\s*'POST'/);
  });

  it('API route POST /products/batch validates and delegates to createBatch', () => {
    expect(route).toMatch(/productsRouter\.post\(\s*['"]\/batch['"]/);
    expect(route).toContain('createBatch');
    // Body must be validated by a Zod schema wrapping createProductSchema.
    expect(route).toMatch(/z\.array\(createProductSchema\)/);
  });

  it('ProductsService.createBatch uses db.transaction (atomic, not a JS loop of inserts)', () => {
    // The method must exist and its body must open a transaction
    // BEFORE iterating items, proving rollback is real.
    expect(service).toMatch(/async\s+createBatch\(/);
    const batchBody = service.match(/async\s+createBatch\([\s\S]*?\n\s\s\}/);
    expect(batchBody, 'createBatch body not found').not.toBeNull();
    expect(batchBody![0]).toContain('this.db.transaction');
    // tx.insert (the transaction handle) must be the one doing the work,
    // not the bare db client — that's the atomicity contract.
    expect(batchBody![0]).toMatch(/tx\.insert\(s\.products\)/);
  });
});
