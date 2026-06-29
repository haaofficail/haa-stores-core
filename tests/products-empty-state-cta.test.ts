import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');
const productsPage = readFileSync(
  resolve(projectRoot, 'apps/merchant-dashboard/src/pages/Products.tsx'),
  'utf-8',
);
const arLocale = readFileSync(
  resolve(projectRoot, 'apps/merchant-dashboard/src/i18n/locales/ar.json'),
  'utf-8',
);

describe('Products empty state first-product CTA', () => {
  it('distinguishes a true empty catalog from filtered no-results', () => {
    expect(productsPage).toContain('const hasActiveProductFilters = Boolean(');
    expect(productsPage).toMatch(/hasActiveProductFilters\s*\?\s*t\('products\.noMatchTitle'/);
    expect(productsPage).toMatch(/:\s*t\('products\.noProductsTitle'/);
  });

  it('opens product creation only for the true empty catalog state', () => {
    const emptyActionStart = productsPage.indexOf("!hasActiveProductFilters && (");
    const noMatchTitleStart = productsPage.indexOf("products.noMatchTitle");

    expect(emptyActionStart).toBeGreaterThan(noMatchTitleStart);
    const emptyAction = productsPage.slice(emptyActionStart, emptyActionStart + 450);

    expect(emptyAction).toContain('permission="products:create"');
    expect(emptyAction).toContain('onClick={openCreate}');
    expect(emptyAction).toContain("products.createFirst");
    expect(emptyAction).toContain('<Plus className="h-4 w-4 me-2" />');
  });

  it('keeps filtered no-results search-oriented instead of showing first-product CTA', () => {
    const filteredCopy = productsPage.slice(
      productsPage.indexOf("products.noMatchTitle"),
      productsPage.indexOf("products.noProductsTitle"),
    );

    expect(filteredCopy).not.toContain('onClick={openCreate}');
    expect(filteredCopy).not.toContain('products.createFirst');
  });

  it('ships Arabic copy for the explicit first-product action', () => {
    expect(arLocale).toContain('"createFirst": "إضافة أول منتج"');
  });
});
