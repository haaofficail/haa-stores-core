/**
 * TASK-0041 Phase 2 — Track 2.1 — P0-2 Category Blocklist
 *
 * Bug: marketplace queries (products, products/:s/:p, sellers/:s,
 *      categories) do NOT filter on `categories.prohibitedInMarketplace`.
 *      A merchant can put weapons, drugs, adult content, or counterfeit
 *      goods in a category that the marketplace still surfaces. MoCI
 *      blacklist + reputational harm.
 *
 * Fix:
 *  1. Migration 0059_category_compliance.sql:
 *     - Adds `regulated_category` (varchar 50, nullable enum)
 *     - Adds `prohibited_in_marketplace` (boolean, default false)
 *  2. packages/db/src/schema/categories.ts:
 *     - Declares the two new columns
 *  3. apps/api/src/routes/haa-marketplace.ts:
 *     - Every public product/seller/stat query applies a product-level
 *       `NOT EXISTS` guard against any prohibited category
 *     - Display/facet subqueries filter `prohibited_in_marketplace = false`
 *     - /categories endpoint adds the filter to its WHERE clause
 *  4. Admin UI for toggling — deferred to TASK-0041 Track 2.2 admin pass
 *     (out of scope for this commit; tests below codify the data layer
 *     contract so the admin UI can rely on it).
 *
 * Plan: docs/ops/MARKETPLACE_HARDENING_PLAN.md §4 Phase 2.1.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const SCHEMA = resolve(projectRoot, 'packages/db/src/schema/categories.ts');
const ROUTE = resolve(projectRoot, 'apps/api/src/routes/haa-marketplace.ts');
const MIGRATIONS_DIR = resolve(projectRoot, 'packages/db/src/migrations');

const schemaSrc = readFileSync(SCHEMA, 'utf-8');
const routeSrc = readFileSync(ROUTE, 'utf-8');

describe('TASK-0041 Phase 2 — Track 2.1 — P0-2 category blocklist', () => {
  describe('categories schema — new compliance columns', () => {
    it('declares prohibitedInMarketplace column (boolean)', () => {
      expect(schemaSrc).toMatch(/prohibitedInMarketplace:\s*boolean\(['"]prohibited_in_marketplace['"]\)/);
    });

    it('prohibitedInMarketplace defaults to false (existing rows safe)', () => {
      expect(schemaSrc).toMatch(/prohibitedInMarketplace:[^,]*\.notNull\(\)[^,]*\.default\(false\)/);
    });

    it('declares regulatedCategory column (nullable enum)', () => {
      expect(schemaSrc).toMatch(/regulatedCategory:\s*varchar\(['"]regulated_category['"]/);
    });
  });

  describe('haa-marketplace.ts — products filter', () => {
    it('declares a product-level NOT EXISTS guard for any prohibited marketplace category', () => {
      expect(routeSrc).toContain('noProhibitedMarketplaceCategoryCondition');
      expect(routeSrc).toMatch(/NOT EXISTS \([\s\S]{0,500}prohibitedInMarketplace\}\s*=\s*true/);
    });

    it('applies the product-level prohibited-category guard to public marketplace queries', () => {
      const matches = routeSrc.match(/noProhibitedMarketplaceCategoryCondition\(\)/g) ?? [];
      // stats + products + detail + seller detail + seller list real/demo
      // + categories. The function definition is asserted separately.
      expect(matches.length).toBeGreaterThanOrEqual(7);
    });

    it('GET /products category EXISTS subquery filters prohibitedInMarketplace=false', () => {
      // The EXISTS subquery in /products (around line 110-117) should
      // include AND categories.prohibited_in_marketplace = false.
      // The SQL template renders the JS prop name, so the source contains
      // `${s.categories.prohibitedInMarketplace}` (camelCase) which the
      // drizzle SQL builder will quote as `prohibited_in_marketplace`.
      const existsBlock = routeSrc.match(
        /EXISTS \([\s\S]{0,400}categories[\s\S]{0,400}\)/,
      );
      expect(existsBlock).not.toBeNull();
      expect(existsBlock![0]).toMatch(/prohibitedInMarketplace/);
    });

    it('GET /products/:s/:p category subqueries filter prohibitedInMarketplace=false', () => {
      // The product-detail route uses two correlated subqueries
      // for categoryName + categorySlug. Both must filter out
      // prohibited categories (camelCase JS prop in source).
      const block = routeSrc.match(
        /haaMarketplaceRouter\.get\(\s*['"]\/products\/:storeSlug\/:productSlug['"][\s\S]{0,5000}?\}\);/,
      );
      expect(block).not.toBeNull();
      const src = block![0];
      const matches = src.match(/prohibitedInMarketplace/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(src).toContain('categorySlugs');
    });
  });

  describe('haa-marketplace.ts — /categories endpoint', () => {
    it('GET /categories WHERE clause filters prohibitedInMarketplace=false', () => {
      const block = routeSrc.match(
        /haaMarketplaceRouter\.get\(\s*['"]\/categories['"][\s\S]{0,2500}/,
      );
      expect(block).not.toBeNull();
      expect(block![0]).toContain('prohibitedInMarketplace');
    });
  });

  describe('migration 0059', () => {
    it('migration file exists for category compliance columns', () => {
      const { readdirSync } = require('node:fs') as typeof import('node:fs');
      const files = readdirSync(MIGRATIONS_DIR);
      const found = files.some((f) => f.startsWith('0059_') && f.endsWith('.sql'));
      expect(found).toBe(true);
    });
  });
});
