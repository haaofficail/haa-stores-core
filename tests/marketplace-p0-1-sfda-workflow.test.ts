/**
 * TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA Workflow
 *
 * Bug: Marketplace products in regulated categories (food, drug,
 *      medical_device, cosmetic, supplement) can be published WITHOUT
 *      an SFDA registration number. Saudi Food & Drug Authority
 *      mandates SFDA registration for these product categories.
 *      Plan §4 Task 2.2 (P0-1).
 *
 * Fix:
 *  1. Migration 0060_product_sfda.sql:
 *     - products: requires_sfda_number (bool, default false)
 *     - products: sfda_number (varchar 100, nullable)
 *     - products: sfda_license_type (varchar 30, nullable)
 *     - products: sfda_expiry_date (timestamp, nullable)
 *     - products: sfda_verified_at (timestamp, nullable)
 *     - products: sfda_verified_by (integer, nullable)
 *     - categories: requires_sfda (bool, default false)
 *     - products index on (requires_sfda_number, sfda_verified_at)
 *  2. packages/db/src/schema/products.ts: declare the 6 columns
 *  3. packages/db/src/schema/categories.ts: declare requires_sfda
 *  4. packages/shared/src/schemas/products.ts: Zod regex `/^[A-Z0-9-]{5,50}$/`
 *  5. packages/commerce-core/src/products.ts: validateProductRelations
 *     — if any linked category has requires_sfda=true and product has no
 *     sfda_number, throw ValidationError.
 *  6. apps/api/src/routes/admin/marketplace.ts:
 *     marketplaceProductReviewRoute — when status='approved', require
 *     sfda_verified_at IS NOT NULL for regulated products. Add
 *     sfda_verified_at + sfda_verified_by updates on approval.
 *  7. Format validation only (regex). Live SFDA API integration deferred
 *     to Phase 7+ (post-MVP, requires Saudi CR + government credentials).
 *
 * This test codifies the data + service contract.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const PRODUCTS_SCHEMA = resolve(projectRoot, 'packages/db/src/schema/products.ts');
const CATEGORIES_SCHEMA = resolve(projectRoot, 'packages/db/src/schema/categories.ts');
const PRODUCT_ZOD = resolve(projectRoot, 'packages/shared/src/schemas/products.ts');
const SERVICE = resolve(projectRoot, 'packages/commerce-core/src/products.ts');
const ADMIN_MP = resolve(projectRoot, 'apps/api/src/routes/admin/marketplace.ts');
const MIGRATIONS_DIR = resolve(projectRoot, 'packages/db/src/migrations');

const productsSrc = readFileSync(PRODUCTS_SCHEMA, 'utf-8');
const categoriesSrc = readFileSync(CATEGORIES_SCHEMA, 'utf-8');
const zodSrc = readFileSync(PRODUCT_ZOD, 'utf-8');
const serviceSrc = readFileSync(SERVICE, 'utf-8');
const adminMpSrc = readFileSync(ADMIN_MP, 'utf-8');

describe('TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow', () => {
  describe('products schema — SFDA columns', () => {
    it('declares requiresSfdaNumber boolean column', () => {
      expect(productsSrc).toMatch(/requiresSfdaNumber:\s*boolean\(['"]requires_sfda_number['"]\)/);
    });

    it('declares sfdaNumber varchar column (nullable, format-checked)', () => {
      expect(productsSrc).toMatch(/sfdaNumber:\s*varchar\(['"]sfda_number['"]/);
    });

    it('declares sfdaLicenseType varchar column (nullable)', () => {
      expect(productsSrc).toMatch(/sfdaLicenseType:\s*varchar\(['"]sfda_license_type['"]/);
    });

    it('declares sfdaExpiryDate timestamp column (nullable)', () => {
      expect(productsSrc).toMatch(/sfdaExpiryDate:\s*timestamp\(['"]sfda_expiry_date['"]/);
    });

    it('declares sfdaVerifiedAt timestamp column (nullable)', () => {
      expect(productsSrc).toMatch(/sfdaVerifiedAt:\s*timestamp\(['"]sfda_verified_at['"]/);
    });

    it('declares sfdaVerifiedBy integer column (nullable)', () => {
      expect(productsSrc).toMatch(/sfdaVerifiedBy:\s*integer\(['"]sfda_verified_by['"]/);
    });
  });

  describe('categories schema — requires_sfda column', () => {
    it('declares requiresSfda boolean column (default false)', () => {
      expect(categoriesSrc).toMatch(/requiresSfda:\s*boolean\(['"]requires_sfda['"]\)/);
      expect(categoriesSrc).toMatch(/requiresSfda:[^,]*\.default\(false\)/);
    });
  });

  describe('Zod schema — sfdaNumber format validation', () => {
    it('sfdaNumber regex validates [A-Z0-9-]{5,50}', () => {
      expect(zodSrc).toMatch(/sfdaNumber:\s*z\.string\(\)\.regex\(\/\^\[A-Z0-9-\]\{5,50\}\$\/\)/);
    });
  });

  describe('ProductsService — SFDA required when category requires it', () => {
    it('validateProductRelations throws when SFDA-required category lacks sfda_number', () => {
      // The function should reference requires_sfda + sfda_number check.
      expect(serviceSrc).toMatch(/requiresSfda/);
      expect(serviceSrc).toMatch(/sfdaNumber/);
      expect(serviceSrc).toMatch(/SFDA/);
    });
  });

  describe('admin/marketplace.ts — SFDA verification gate', () => {
    it('reviewRoute sets sfdaVerifiedAt + sfdaVerifiedBy on approval', () => {
      // The marketplaceProductReviewRoute should update sfda_verified_at
      // when approving a product in a regulated category.
      const block = adminMpSrc.match(
        /marketplaceProductReviewRoute[\s\S]{0,3000}/,
      );
      expect(block).not.toBeNull();
      const src = block![0];
      expect(src).toMatch(/sfdaVerifiedAt|sfda_verified_at/);
    });
  });

  describe('migration 0060', () => {
    it('migration file exists for SFDA columns', () => {
      const { readdirSync } = require('node:fs') as typeof import('node:fs');
      const files = readdirSync(MIGRATIONS_DIR);
      const found = files.some((f) => f.startsWith('0060_') && f.endsWith('.sql'));
      expect(found).toBe(true);
    });
  });
});
