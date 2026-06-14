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
    const source = readSource('apps/api/src/routes/storefront/products.ts');

    // The category endpoint under /:slug/categories is store-scoped via eq(s.categories.storeId, store.id)
    expect(source).toContain('eq(s.categories.storeId, store.id)');
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
    const storefrontCart = readSource('apps/storefront/src/pages/Cart.tsx');
    const storefrontCheckout = readSource('apps/storefront/src/pages/Checkout.tsx');
    const storefrontCartRouter = readSource('apps/api/src/routes/storefront/cart.ts');
    const storefrontCheckoutRouter = readSource('apps/api/src/routes/storefront/checkout.ts');
    const cartService = readSource('packages/commerce-core/src/cart.ts');
    const checkoutService = readSource('packages/commerce-core/src/checkout.ts');
    const ordersService = readSource('packages/commerce-core/src/orders.ts');

    expect(productDetail).toContain('selectedVariant?.id');
    expect(storefrontApi).toContain('variantId?: number');
    expect(storefrontCart).toContain('item.variantId ?? undefined');
    expect(storefrontCart).toContain('getVariantLabel(item)');
    expect(storefrontCheckout).toContain('getVariantLabel(item)');
    expect(storefrontCartRouter).toContain('variantId: z.coerce.number().optional()');
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
    expect(routes).toContain("new WebhookOutboxService().recordEvent('product.marketplace_sync_failed'");
    expect(auditTypes).toContain("'product_bulk_updated'");
    expect(auditTypes).toContain("'product_marketplace_sync_failed'");
    expect(auditTypes).toContain("'product.marketplace_sync_failed'");
    expect(auditLabels).toContain("product_bulk_updated: 'تحديث منتجات جماعي'");
    expect(auditLabels).toContain("product_marketplace_sync_failed: 'فشل مزامنة منتج مع السوق'");
  });

  it('haa marketplace is a public cross-store marketplace with merchant opt-in and commission tracking', () => {
    const apiIndex = readSource('apps/api/src/index.ts');
    const marketplaceRoute = readSource('apps/api/src/routes/haa-marketplace.ts');
    const storefrontApp = readSource('apps/storefront/src/App.tsx');
    const marketplaceEntry = readSource('apps/storefront/src/pages/HaaMarketplace.tsx');
    const marketplacePage = readSource('apps/storefront/src/pages/marketplace/MarketplaceEdition.tsx');
    const marketplaceHero = readSource('apps/storefront/src/pages/marketplace/theme/MarketplaceHero.tsx');
    const marketplaceProductCard = readSource('apps/storefront/src/pages/marketplace/theme/MarketplaceProductCard.tsx');
    const marketplaceProductDetail = readSource('apps/storefront/src/pages/marketplace/MarketplaceProductDetail.tsx');
    const productForm = readSource('apps/merchant-dashboard/src/components/products/ProductFormDialog.tsx');
    const dashboardSidebar = readSource('apps/merchant-dashboard/src/components/layout/Sidebar.tsx');
    const productSchema = readSource('packages/db/src/schema/products.ts');
    const checkout = readSource('packages/commerce-core/src/checkout.ts');

    expect(apiIndex).toContain("app.route('/marketplace', haaMarketplaceRouter)");
    expect(marketplaceRoute).toContain('eq(s.products.haaMarketplaceEnabled, true)');
    expect(marketplaceRoute).toContain("eq(s.stores.publishStatus, 'published')");
    expect(storefrontApp).toContain('<Route path="/marketplace" element={<HaaMarketplace />} />');
    expect(storefrontApp).toContain('<Route path="/marketplace/cart" element={<MarketplaceCart />} />');
    expect(storefrontApp).toContain('<Route path="/marketplace/checkout" element={<MarketplaceCheckout />} />');
    expect(storefrontApp).toContain('<Route path="/marketplace/order/:orderNumber" element={<MarketplaceOrderTrack />} />');
    expect(storefrontApp).toContain('<Route path="/marketplace/products/:storeSlug/:productSlug" element={<MarketplaceProductDetail />} />');
    expect(storefrontApp).toContain('<Route path="/marketplace/sellers/:storeSlug" element={<MarketplaceSeller />} />');
    expect(marketplaceRoute).toContain("haaMarketplaceRouter.get('/products/:storeSlug/:productSlug'");
    expect(marketplaceRoute).toContain('productUrl: `/marketplace/products/${row.storeSlug}/${row.slug}`');
    expect(marketplaceRoute).toContain('merchantProductUrl: `/s/${row.storeSlug}/p/${row.slug}?source=haa_marketplace`');
    expect(marketplaceEntry).toContain("import MarketplaceEdition from './marketplace/MarketplaceEdition'");
    expect(marketplaceHero).toContain('سوق هاء');
    expect(marketplaceHero).toContain('تتبع الطلب');
    expect(marketplaceProductDetail).toContain('haaMarketplaceApi.getProduct');
    expect(marketplaceProductDetail).toContain('عرض في متجر التاجر');
    expect(marketplaceProductDetail).toContain('أضف للسلة');
    expect(marketplacePage).toContain('haaMarketplaceApi.listProducts');
    expect(marketplacePage).toContain('haaMarketplaceApi.listCategories');
    expect(marketplacePage).toContain("searchParams.get('category')");
    expect(marketplaceProductCard).toContain('marketplaceCart.add(product, 1)');
    const marketplaceCheckout = readSource('apps/storefront/src/pages/MarketplaceCheckout.tsx');
    const marketplaceApiRoute = readSource('apps/api/src/routes/haa-marketplace.ts');
    const marketplaceTrack = readSource('apps/storefront/src/pages/MarketplaceOrderTrack.tsx');
    expect(marketplaceCheckout).toContain("'haa_marketplace'");
    expect(marketplaceCheckout).toContain('checkoutApi.createSession');
    expect(marketplaceCheckout).toContain('haaMarketplaceApi.createOrder');
    expect(marketplaceApiRoute).toContain("haaMarketplaceRouter.post('/orders'");
    expect(marketplaceApiRoute).toContain("haaMarketplaceRouter.get('/orders/:marketplaceOrderNumber'");
    expect(readSource('apps/storefront/src/App.tsx')).toContain('path="/marketplace/orders"');
    expect(marketplaceApiRoute).toContain("haaMarketplaceRouter.get('/categories'");
    expect(marketplaceApiRoute).toContain("haaMarketplaceRouter.get('/sellers/:storeSlug'");
    expect(marketplaceApiRoute).toContain("haaMarketplaceRouter.get('/sellers'");
    expect(marketplaceApiRoute).toContain("eq(s.products.haaMarketplaceReviewStatus, 'approved')");
    expect(marketplaceApiRoute).toContain('minPrice');
    expect(marketplaceApiRoute).toContain('availableOnly');
    expect(marketplaceApiRoute).toContain('marketplaceOrderLinks');
    expect(marketplaceTrack).toContain('استعلام وتتبع طلبات سوق هاء');
    expect(marketplaceTrack).toContain('استعلام وتتبع');
    expect(marketplaceTrack).toContain('رقم طلب السوق');
    expect(readSource('apps/storefront/src/pages/MarketplaceSeller.tsx')).toContain('بائع في سوق هاء');
    expect(readSource('apps/storefront/src/pages/MarketplaceSeller.tsx')).toContain('store: storeSlug');
    expect(readSource('apps/storefront/src/pages/MarketplaceSellers.tsx')).toContain('بائعو سوق هاء');
    expect(readSource('apps/admin-dashboard/src/pages/Marketplace.tsx')).toContain('إدارة سوق هاء');
    expect(readSource('apps/admin-dashboard/src/pages/Marketplace.tsx')).toContain('قناة تسويق ورقابة');
    expect(readSource('apps/admin-dashboard/src/pages/Marketplace.tsx')).toContain('تقرير السوق العميق');
    expect(readSource('apps/admin-dashboard/src/pages/Marketplace.tsx')).toContain('/payments/settlements');
    expect(readSource('apps/admin-dashboard/src/pages/Marketplace.tsx')).toContain('مسار التسويات اليدوية');
    expect(readSource('apps/api/src/routes/admin.ts')).toContain("adminRouter.get('/marketplace/summary'");
    expect(readSource('apps/api/src/routes/admin.ts')).toContain("adminRouter.patch('/marketplace/products/:id/review'");
    expect(readSource('apps/api/src/routes/admin.ts')).toContain("adminRouter.patch('/marketplace/products/:id/feature'");
    expect(readSource('apps/api/src/routes/admin.ts')).toContain("adminRouter.get('/marketplace/deep-report'");
    expect(readSource('apps/api/src/routes/admin.ts')).not.toContain("adminRouter.get('/marketplace/returns'");
    expect(marketplaceApiRoute).not.toContain("haaMarketplaceRouter.post('/orders/:marketplaceOrderNumber/returns'");
    expect(marketplaceTrack).toContain('يكتمل عند التاجر');
    expect(marketplaceTrack).toContain('متابعة إجراءات الطلب عند التاجر');
    expect(marketplaceTrack).not.toContain('طلب إرجاع');
    expect(marketplaceTrack).not.toContain('فتح نزاع');
    expect(productForm).toContain('سوق هاء العام');
    expect(productForm).toContain('haaMarketplaceEnabled');
    expect(dashboardSidebar).toContain('/marketplace');
    expect(productSchema).toContain('haaMarketplaceCommissionRate');
    expect(checkout).toContain("i.item.source === 'haa_marketplace'");
    expect(checkout).toContain('platformCommission');
  });
});
