import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildProductsCsv } from '../apps/merchant-dashboard/src/lib/products/csv';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf-8');

describe('Products QA regression', () => {
  it('clears product selection when the visible result set changes', () => {
    const source = readSource('apps/merchant-dashboard/src/pages/Products.tsx');

    expect(source).toContain('setSelectedIds(new Set())');
    expect(source).toContain('[page, statusFilter, categoryFilter, brandFilter, tagFilter, search, stockFilter, typeFilter]');
  });

  it('persists the merchant product view mode preference', () => {
    const source = readSource('apps/merchant-dashboard/src/pages/Products.tsx');

    expect(source).toContain("localStorage.getItem('products_view_mode')");
    expect(source).toContain("localStorage.setItem('products_view_mode', viewMode)");
  });

  it('grid view uses RTL logical positioning and accessible touch targets', () => {
    const source = readSource('apps/merchant-dashboard/src/components/products/ProductGrid.tsx');

    expect(source).toContain('absolute top-2 end-2');
    expect(source).toContain('aria-label');
    expect(source).toContain('h-11 w-11');
    expect(source).toContain('object-contain');
    expect(source).not.toContain('absolute top-2 right-2');
  });

  it('table view supports partial select-all state and accessible touch targets', () => {
    const source = readSource('apps/merchant-dashboard/src/components/products/ProductListTable.tsx');

    expect(source).toContain('indeterminate = partiallySelected');
    expect(source).toContain('visibleSelectedCount');
    expect(source).toContain('h-11 w-11');
  });

  it('CSV export escapes commas, quotes, and line breaks', async () => {
    const blob = buildProductsCsv([
      {
        id: 1,
        name: 'منتج, خاص "فاخر"',
        sku: 'SKU\n001',
        price: '10',
        compareAtPrice: '',
        stockQuantity: 3,
        status: 'draft',
        categories: [{ name: 'تصنيف, أ' }],
        createdAt: '2026-06-13T00:00:00.000Z',
      },
    ], new Set([1]));

    const text = await blob.text();
    expect(text).toContain('"منتج, خاص ""فاخر"""');
    expect(text).toContain('"SKU\n001"');
    expect(text).toContain('"تصنيف, أ"');
  });

  it('product image deletion is scoped to the owning store and bumps cache', () => {
    const source = readSource('packages/commerce-core/src/products.ts');

    expect(source).toContain('eq(s.products.storeId, storeId)');
    expect(source).toContain('innerJoin(s.products, eq(s.productImages.productId, s.products.id))');
    expect(source).toContain('await cacheBumpNamespace(this.cacheNamespace(storeId));');
  });

  it('product relation ids are validated against the current store', () => {
    const source = readSource('packages/commerce-core/src/products.ts');

    expect(source).toContain('validateProductRelations');
    expect(source).toContain('Brand does not belong to this store');
    expect(source).toContain('One or more categories do not belong to this store');
    expect(source).toContain('One or more tags do not belong to this store');
  });

  it('storefront category slug resolution is store-scoped', () => {
    const source = readSource('apps/api/src/routes/storefront.ts');

    expect(source).toContain("and(eq(s.categories.slug, categorySlug), eq(s.categories.storeId, store.id))");
  });

  it('product detail stock state is derived from real inventory', () => {
    const source = readSource('apps/storefront/src/pages/ProductDetail.tsx');

    expect(source).toContain('product?.trackInventory && effectiveStockQuantity <= 0');
    expect(source).toContain('product?.trackInventory && effectiveStockQuantity > 0 && effectiveStockQuantity <= 5');
    expect(source).not.toContain('const isOutOfStock = false');
    expect(source).not.toContain('const isLowStock = false');
  });

  it('selected storefront variants flow into cart and checkout stock handling', () => {
    const productDetail = readSource('apps/storefront/src/pages/ProductDetail.tsx');
    const storefrontApi = readSource('apps/storefront/src/lib/api.ts');
    const storefrontRouter = readSource('apps/api/src/routes/storefront.ts');
    const cartService = readSource('packages/commerce-core/src/cart.ts');
    const checkoutService = readSource('packages/commerce-core/src/checkout.ts');
    const ordersService = readSource('packages/commerce-core/src/orders.ts');

    expect(productDetail).toContain('selectedVariant?.id');
    expect(storefrontApi).toContain('variantId?: number');
    expect(storefrontRouter).toContain('variantId: z.coerce.number().optional()');
    expect(cartService).toContain('eq(s.productVariants.id, variantId)');
    expect(cartService).toContain('variantId !== undefined ? eq(s.cartItems.variantId, variantId) : isNull(s.cartItems.variantId)');
    expect(checkoutService).toContain('s.productVariants.stockQuantity');
    expect(ordersService).toContain('variantId: item.variantId ?? null');
  });

  it('cart variant foreign key points to product variants', () => {
    const schema = readSource('packages/db/src/schema/cart.ts');
    const migration = readSource('packages/db/src/migrations/0032_cart_variant_fk.sql');

    expect(schema).toContain("import { products, productVariants } from './products.js'");
    expect(schema).toContain('variantId: integer');
    expect(schema).toContain('references(() => productVariants.id)');
    expect(migration).toContain('FOREIGN KEY (variant_id) REFERENCES product_variants(id)');
  });

  it('merchant product mutations are audit logged', () => {
    const routes = readSource('apps/api/src/routes/products.ts');
    const auditTypes = readSource('packages/shared/src/types/orders.ts');
    const auditLabels = readSource('packages/shared/src/types/audit.ts');

    expect(routes).toContain("action: 'product_created'");
    expect(routes).toContain("action: 'product_updated'");
    expect(routes).toContain("action: 'product_archived'");
    expect(routes).toContain("action: 'product_bulk_updated'");
    expect(routes).toContain("action: 'product_marketplace_sync_failed'");
    expect(auditTypes).toContain("'product_bulk_updated'");
    expect(auditTypes).toContain("'product_marketplace_sync_failed'");
    expect(auditLabels).toContain("product_bulk_updated: 'تحديث منتجات جماعي'");
    expect(auditLabels).toContain("product_marketplace_sync_failed: 'فشل مزامنة منتج مع السوق'");
  });
});
