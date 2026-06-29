import { Hono } from 'hono';
import { and, count, countDistinct, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { paginationSchema, validateProductForMarketplace, type SfdaValidation } from '@haa/shared';

const haaMarketplaceRouter = new Hono();

function money(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function generateMarketplaceOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HM-${y}${m}${d}-${rand}`;
}

// ── Marketplace visibility — SINGLE SOURCE OF TRUTH ──────────────────────
// A product is visible in سوق هاء iff it satisfies one of these branches.
// Used by the product feed AND every count/facet/seller query so an
// advertised count can never exceed what the feed actually returns
// (fixes the "20 منتج في السوق" badge over an empty grid — broken promise).
//
// BOTH branches require haaMarketplaceEnabled=true (TASK-0038 moderation gate);
// demo stores additionally need an approved demoProfile (TASK-0040 whitelist).
// Callers still apply their own `products.status='active'` + store-active
// filters alongside this OR-branch, exactly as the feed does.
const realStoreMarketplaceCondition = () =>
  and(
    eq(s.stores.isDemo, false),
    eq(s.products.haaMarketplaceEnabled, true),
    eq(s.products.haaMarketplaceReviewStatus, 'approved'),
  );

const demoStoreMarketplaceCondition = () =>
  and(
    eq(s.stores.isDemo, true),
    eq(s.products.haaMarketplaceEnabled, true),
    // SQL form of the shared `shouldShowInMarketplace` whitelist
    // (packages/shared/src/demo/demo-rules.ts): only 'main' / 'perfume'
    // demo profiles surface in سوق هاء. Keep this list in sync with it.
    sql`${s.stores.demoProfile} IN ('main', 'perfume')`,
  );

const marketplaceVisibleProductCondition = () =>
  or(realStoreMarketplaceCondition(), demoStoreMarketplaceCondition())!;

const noProhibitedMarketplaceCategoryCondition = () => sql`NOT EXISTS (
  SELECT 1
  FROM ${s.productCategories}
  INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
  WHERE ${s.productCategories.productId} = ${s.products.id}
    AND ${s.categories.prohibitedInMarketplace} = true
)`;

type ProductImageRow = { url: string | null; thumbUrl: string | null };

interface MarketplaceProductRow {
  images?: ProductImageRow[] | null;
  storeIsDemo?: boolean | null;
  categorySlug?: string | null;
  categorySlugs?: string[] | null;
  sfdaNumber?: string | null;
  sfdaExpiryDate?: string | Date | null;
  sfdaVerifiedAt?: string | Date | null;
  // The remaining columns are passed straight through to the JSON response.
  [key: string]: unknown;
}

function mapProduct(row: MarketplaceProductRow) {
  const imageUrls: string[] = Array.isArray(row.images)
    ? row.images.map((img) => img?.url ?? img?.thumbUrl ?? '').filter(Boolean)
    : [];
  const demoStore = row.storeIsDemo === true;
  // TASK-0038 audit P0-#6: SFDA + restricted categories enforcement.
  // Products in hard-prohibited categories are never listed.
  // Products in SFDA-gated categories need a valid, non-expired,
  // admin-verified SFDA number. We compute the validation here so
  // we can filter the row out before it ever reaches the DTO.
  const categorySlugs: string[] = Array.isArray(row.categorySlugs)
    ? row.categorySlugs.filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    : row.categorySlug ? [row.categorySlug] : [];
  const sfdaCheck: SfdaValidation = validateProductForMarketplace({
    categorySlugs,
    sfdaNumber: row.sfdaNumber,
    sfdaExpiryDate: row.sfdaExpiryDate,
    sfdaVerifiedAt: row.sfdaVerifiedAt,
  });
  if (!sfdaCheck.allowed) {
    return null; // Caller must filter out nulls.
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    images: imageUrls,
    status: row.status,
    type: row.type,
    sku: row.sku,
    stockQuantity: row.stockQuantity,
    trackInventory: row.trackInventory,
    rating: row.rating ?? null,
    reviewCount: row.reviewCount ?? 0,
    salesCount: row.salesCount ?? 0,
    isDemoStore: demoStore,
    haaMarketplaceFeatured: row.haaMarketplaceFeatured ?? false,
    categoryName: row.categoryName ?? null,
    categorySlug: row.categorySlug ?? null,
    store: {
      id: row.storeId,
      name: row.storeName,
      slug: row.storeSlug,
      logoUrl: row.storeLogoUrl,
      city: row.storeCity,
      isDemoStore: demoStore,
      // TASK-0038 audit P0-#3: gate 'متجر موثوق' on real KYC + business
      // registration. Default false — only set true after KYC + MoCI
      // verification. Currently no stores qualify (pre-launch).
      kycVerified: false,
    },
    commissionRate: row.haaMarketplaceCommissionRate,
    productUrl: `/marketplace/products/${row.storeSlug}/${row.slug}`,
    merchantProductUrl: `/s/${row.storeSlug}/p/${row.slug}?source=haa_marketplace`,
  };
}

// TASK-0038 audit P1-#3: public stats endpoint for the landing page.
// Returns the actual count of tenants in the platform so the
// marketing claim "X+ merchants" can be backed by real data.
// The landing page is expected to call this and only display the
// hardcoded claim if the count is consistent with the copy.
haaMarketplaceRouter.get('/stats', async (c) => {
  const db = createDbClient();
  // Count distinct tenants (merchants) that have at least one
  // store, excluding demo accounts.
  const [{ merchantCount }] = await db
    .select({ merchantCount: countDistinct(s.tenants.id) })
    .from(s.tenants)
    .innerJoin(s.stores, eq(s.stores.tenantId, s.tenants.id))
    .where(eq(s.stores.isDemo, false));

  // Total marketplace-visible products — same predicate as the feed so the
  // "X منتج متاح" header can't disagree with the grid (now includes enabled
  // demo products instead of excluding all demo stores).
  const [{ productCount }] = await db
    .select({ productCount: count() })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(
      eq(s.products.status, 'active'),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
      marketplaceVisibleProductCondition(),
      noProhibitedMarketplaceCategoryCondition(),
    ));

  return c.json({
    success: true,
    data: {
      merchantCount,
      productCount,
      // ISO timestamp of when these stats were computed
      asOf: new Date().toISOString(),
    },
  });
});

haaMarketplaceRouter.get('/products', async (c) => {
  const query = paginationSchema.parse(c.req.query());
  const search = c.req.query('search') || undefined;
  const category = c.req.query('category') || undefined;
  const storeSlug = c.req.query('store') || undefined;
  const minPrice = c.req.query('minPrice') ? Number(c.req.query('minPrice')) : undefined;
  const maxPrice = c.req.query('maxPrice') ? Number(c.req.query('maxPrice')) : undefined;
  const availableOnly = c.req.query('availableOnly') === 'true';
  const featuredOnly = c.req.query('featured') === 'true';
  const sort = c.req.query('sort') || 'featured';
  const db = createDbClient();

  // Real stores: strict marketplace approval. Demo stores: enabled + whitelisted
  // profile. Both via the shared marketplaceVisibleProductCondition() so the feed
  // and every count/facet query stay in lock-step (TASK-0038 + TASK-0040).
  const conditions = [
    eq(s.products.status, 'active'),
    eq(s.stores.status, 'active'),
    eq(s.stores.isActive, true),
    eq(s.stores.publishStatus, 'published'),
    marketplaceVisibleProductCondition(),
    noProhibitedMarketplaceCategoryCondition(),
  ];

  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(s.products.name, term), ilike(s.stores.name, term))!);
  }
  if (category) {
    // TASK-0041 Phase 2 — Track 2.1 — P0-2 category blocklist.
    // Exclude prohibited categories from marketplace browse.
    conditions.push(sql`EXISTS (
      SELECT 1
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
        AND ${s.categories.slug} = ${category}
        AND ${s.categories.prohibitedInMarketplace} = false
    )`);
  }
  if (storeSlug) {
    conditions.push(eq(s.stores.slug, storeSlug));
  }
  if (minPrice !== undefined && Number.isFinite(minPrice)) conditions.push(gte(s.products.price, minPrice.toString()));
  if (maxPrice !== undefined && Number.isFinite(maxPrice)) conditions.push(lte(s.products.price, maxPrice.toString()));
  if (availableOnly) conditions.push(or(eq(s.products.trackInventory, false), sql`${s.products.stockQuantity} > 0`)!);
  if (featuredOnly) {
    conditions.push(eq(s.products.haaMarketplaceFeatured, true));
    conditions.push(or(sql`${s.products.haaMarketplaceFeaturedUntil} IS NULL`, gte(s.products.haaMarketplaceFeaturedUntil, new Date()))!);
  }

  const where = and(...conditions);
  const [{ total }] = await db.select({ total: count() })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(where);

  const rows = await db.select({
    id: s.products.id,
    storeId: s.products.storeId,
    name: s.products.name,
    slug: s.products.slug,
    description: s.products.description,
    status: s.products.status,
    type: s.products.type,
    price: s.products.price,
    compareAtPrice: s.products.compareAtPrice,
    sku: s.products.sku,
    stockQuantity: s.products.stockQuantity,
    trackInventory: s.products.trackInventory,
    rating: s.products.rating,
    reviewCount: s.products.reviewCount,
    salesCount: s.products.salesCount,
    haaMarketplaceCommissionRate: s.products.haaMarketplaceCommissionRate,
    haaMarketplaceFeatured: s.products.haaMarketplaceFeatured,
    // TASK-0038 audit P0-#6: SFDA fields for restricted-category gate
    sfdaNumber: s.products.sfdaNumber,
    sfdaExpiryDate: s.products.sfdaExpiryDate,
    sfdaVerifiedAt: s.products.sfdaVerifiedAt,
    storeName: s.stores.name,
    storeSlug: s.stores.slug,
    storeLogoUrl: s.stores.logoUrl,
    storeCity: s.stores.city,
    storeIsDemo: s.stores.isDemo,
    categoryName: sql<string | null>`(
      SELECT ${s.categories.name}
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
        AND ${s.categories.prohibitedInMarketplace} = false
      ORDER BY ${s.categories.sortOrder} ASC
      LIMIT 1
    )`,
    categorySlug: sql<string | null>`(
      SELECT ${s.categories.slug}
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
        AND ${s.categories.prohibitedInMarketplace} = false
      ORDER BY ${s.categories.sortOrder} ASC
      LIMIT 1
    )`,
    categorySlugs: sql<string[]>`COALESCE((
      SELECT array_agg(${s.categories.slug})
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
    ), ARRAY[]::text[])`,
    images: sql<ProductImageRow[]>`COALESCE((
      SELECT jsonb_agg(jsonb_build_object('url', ${s.productImages.url}, 'thumbUrl', ${s.productImages.thumbUrl}) ORDER BY ${s.productImages.sortOrder})
      FROM ${s.productImages}
      WHERE ${s.productImages.productId} = ${s.products.id}
    ), '[]'::jsonb)`,
  })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(where)
    .orderBy(
      sort === 'price_asc' ? sql`${s.products.price} ASC` :
      sort === 'price_desc' ? sql`${s.products.price} DESC` :
      sort === 'newest' ? desc(s.products.createdAt) :
      sql`${s.products.haaMarketplaceFeatured} DESC, ${s.products.haaMarketplaceFeaturedSortOrder} ASC, ${s.products.createdAt} DESC`,
    )
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return c.json({
    success: true,
    data: {
      data: rows.map(mapProduct).filter((p): p is NonNullable<ReturnType<typeof mapProduct>> => p !== null),
      total: Number(total),
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(Number(total) / query.limit),
    },
  });
});

haaMarketplaceRouter.get('/products/:storeSlug/:productSlug', async (c) => {
  const storeSlug = c.req.param('storeSlug');
  const productSlug = c.req.param('productSlug');
  const db = createDbClient();

  const [row] = await db.select({
    id: s.products.id,
    storeId: s.products.storeId,
    name: s.products.name,
    slug: s.products.slug,
    description: s.products.description,
    status: s.products.status,
    type: s.products.type,
    price: s.products.price,
    compareAtPrice: s.products.compareAtPrice,
    sku: s.products.sku,
    stockQuantity: s.products.stockQuantity,
    trackInventory: s.products.trackInventory,
    rating: s.products.rating,
    reviewCount: s.products.reviewCount,
    salesCount: s.products.salesCount,
    haaMarketplaceCommissionRate: s.products.haaMarketplaceCommissionRate,
    haaMarketplaceFeatured: s.products.haaMarketplaceFeatured,
    // TASK-0038 audit P0-#6: SFDA fields
    sfdaNumber: s.products.sfdaNumber,
    sfdaExpiryDate: s.products.sfdaExpiryDate,
    sfdaVerifiedAt: s.products.sfdaVerifiedAt,
    storeName: s.stores.name,
    storeSlug: s.stores.slug,
    storeLogoUrl: s.stores.logoUrl,
    storeCity: s.stores.city,
    storeIsDemo: s.stores.isDemo,
    categoryName: sql<string | null>`(
      SELECT ${s.categories.name}
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
        AND ${s.categories.prohibitedInMarketplace} = false
      ORDER BY ${s.categories.sortOrder} ASC
      LIMIT 1
    )`,
    categorySlug: sql<string | null>`(
      SELECT ${s.categories.slug}
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
        AND ${s.categories.prohibitedInMarketplace} = false
      ORDER BY ${s.categories.sortOrder} ASC
      LIMIT 1
    )`,
    categorySlugs: sql<string[]>`COALESCE((
      SELECT array_agg(${s.categories.slug})
      FROM ${s.productCategories}
      INNER JOIN ${s.categories} ON ${s.categories.id} = ${s.productCategories.categoryId}
      WHERE ${s.productCategories.productId} = ${s.products.id}
    ), ARRAY[]::text[])`,
    images: sql<ProductImageRow[]>`COALESCE((
      SELECT jsonb_agg(jsonb_build_object('url', ${s.productImages.url}, 'thumbUrl', ${s.productImages.thumbUrl}) ORDER BY ${s.productImages.sortOrder})
      FROM ${s.productImages}
      WHERE ${s.productImages.productId} = ${s.products.id}
    ), '[]'::jsonb)`,
  })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(
      eq(s.products.slug, productSlug),
      eq(s.stores.slug, storeSlug),
      eq(s.products.status, 'active'),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
      marketplaceVisibleProductCondition(),
      noProhibitedMarketplaceCategoryCondition(),
    ))
    .limit(1);

  if (!row) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المنتج غير موجود في سوق هاء.' } }, 404);
  }

  const mapped = mapProduct(row);
  if (!mapped) {
    return c.json({ success: false, error: { code: 'PROHIBITED_CATEGORY', message: 'Product is in a restricted category' } }, 403);
  }
  return c.json({ success: true, data: mapped });
});

haaMarketplaceRouter.get('/sellers/:storeSlug', async (c) => {
  const storeSlug = c.req.param('storeSlug');
  const db = createDbClient();
  // Fetch store info
  const [storeRow] = await db.select({
    id: s.stores.id,
    name: s.stores.name,
    slug: s.stores.slug,
    description: s.stores.description,
    logoUrl: s.stores.logoUrl,
    coverUrl: s.stores.coverUrl,
    city: s.stores.city,
    district: s.stores.district,
    seoTitle: s.stores.seoTitle,
    seoDescription: s.stores.seoDescription,
    isDemo: s.stores.isDemo,
    createdAt: s.stores.createdAt,
  })
    .from(s.stores)
    .where(and(
      eq(s.stores.slug, storeSlug),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
    ))
    .limit(1);

  if (!storeRow) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'البائع غير موجود في سوق هاء.' } }, 404);
  }

  // Count marketplace-visible products — same predicate as the feed so the
  // header badge can never disagree with the grid (demo stores previously
  // counted unmoderated products here).
  const [{ productCount }] = await db.select({ productCount: count(s.products.id) })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(
      eq(s.stores.id, storeRow.id),
      eq(s.products.status, 'active'),
      marketplaceVisibleProductCondition(),
      noProhibitedMarketplaceCategoryCondition(),
    ));

  if (Number(productCount) === 0) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'البائع غير موجود في سوق هاء.' } }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: storeRow.id,
      name: storeRow.name,
      slug: storeRow.slug,
      description: storeRow.description,
      logoUrl: storeRow.logoUrl,
      coverUrl: storeRow.coverUrl,
      city: storeRow.city,
      district: storeRow.district,
      // TASK-0043 Track 4C — T8: do NOT leak stores.email or
      // stores.phone in the public marketplace seller shape. Customers
      // contact merchants via the store page's contact form (which
      // gates by /s/:slug server-rendered HTML, not the marketplace API).
      seoTitle: storeRow.seoTitle,
      seoDescription: storeRow.seoDescription,
      isDemo: storeRow.isDemo,
      createdAt: storeRow.createdAt,
      productCount: Number(productCount),
      marketplaceUrl: `/marketplace/sellers/${storeRow.slug}`,
      storefrontUrl: `/s/${storeRow.slug}`,
    },
  });
});

haaMarketplaceRouter.get('/sellers', async (c) => {
  const db = createDbClient();

  // Real stores with marketplace approval
  const realSellers = db.select({
    id: s.stores.id,
    name: s.stores.name,
    slug: s.stores.slug,
    description: s.stores.description,
    logoUrl: s.stores.logoUrl,
    coverUrl: s.stores.coverUrl,
    city: s.stores.city,
    district: s.stores.district,
    isDemo: s.stores.isDemo,
    productCount: count(s.products.id),
  })
    .from(s.stores)
    .innerJoin(s.products, eq(s.products.storeId, s.stores.id))
    .where(and(
      realStoreMarketplaceCondition(),
      eq(s.products.status, 'active'),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
      noProhibitedMarketplaceCategoryCondition(),
    ))
    .groupBy(s.stores.id, s.stores.name, s.stores.slug, s.stores.description, s.stores.logoUrl, s.stores.coverUrl, s.stores.city, s.stores.district, s.stores.isDemo);

  // Demo stores: marketplace-enabled products with a whitelisted demoProfile
  // (same gate as the feed — previously counted unmoderated demo products).
  const demoSellers = db.select({
    id: s.stores.id,
    name: s.stores.name,
    slug: s.stores.slug,
    description: s.stores.description,
    logoUrl: s.stores.logoUrl,
    coverUrl: s.stores.coverUrl,
    city: s.stores.city,
    district: s.stores.district,
    isDemo: s.stores.isDemo,
    productCount: count(s.products.id),
  })
    .from(s.stores)
    .innerJoin(s.products, eq(s.products.storeId, s.stores.id))
    .where(and(
      demoStoreMarketplaceCondition(),
      eq(s.products.status, 'active'),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
      noProhibitedMarketplaceCategoryCondition(),
    ))
    .groupBy(s.stores.id, s.stores.name, s.stores.slug, s.stores.description, s.stores.logoUrl, s.stores.coverUrl, s.stores.city, s.stores.district, s.stores.isDemo);

  const [realRows, demoRows] = await Promise.all([realSellers, demoSellers]);
  const rows = [...realRows, ...demoRows].sort((a, b) => Number(b.productCount) - Number(a.productCount));

  return c.json({
    success: true,
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      logoUrl: row.logoUrl,
      coverUrl: row.coverUrl,
      city: row.city,
      district: row.district,
      isDemo: row.isDemo,
      productCount: Number(row.productCount),
      marketplaceUrl: `/marketplace/sellers/${row.slug}`,
      storefrontUrl: `/s/${row.slug}`,
    })),
  });
});

haaMarketplaceRouter.get('/categories', async (c) => {
  const db = createDbClient();
  const rows = await db.select({
    name: s.categories.name,
    slug: s.categories.slug,
    count: count(s.products.id),
  })
    .from(s.categories)
    .innerJoin(s.productCategories, eq(s.productCategories.categoryId, s.categories.id))
    .innerJoin(s.products, eq(s.products.id, s.productCategories.productId))
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(
      eq(s.products.status, 'active'),
      eq(s.stores.status, 'active'),
      eq(s.stores.isActive, true),
      eq(s.stores.publishStatus, 'published'),
      // TASK-0041 Phase 2 — Track 2.1 — P0-2 category blocklist.
      // Exclude prohibited categories from the marketplace category list.
      eq(s.categories.prohibitedInMarketplace, false),
      marketplaceVisibleProductCondition(),
      noProhibitedMarketplaceCategoryCondition(),
    ))
    .groupBy(s.categories.name, s.categories.slug)
    .orderBy(sql`count(${s.products.id}) DESC`, s.categories.name);

  return c.json({
    success: true,
    data: rows.map((row) => ({
      name: row.name,
      slug: row.slug,
      count: Number(row.count),
    })),
  });
});

const createMarketplaceOrderSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  subOrders: z.array(z.object({
    storeSlug: z.string().min(1),
    orderNumber: z.string().min(1).max(50),
  })).min(1),
});

haaMarketplaceRouter.post('/orders', zValidator('json', createMarketplaceOrderSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();

  const links: Array<{
    order: typeof s.orders.$inferSelect;
    store: typeof s.stores.$inferSelect;
  }> = [];

  for (const subOrder of body.subOrders) {
    const [row] = await db.select({ order: s.orders, store: s.stores })
      .from(s.orders)
      .innerJoin(s.stores, eq(s.orders.storeId, s.stores.id))
      .where(and(
        eq(s.stores.slug, subOrder.storeSlug),
        eq(s.orders.orderNumber, subOrder.orderNumber),
        eq(s.orders.customerPhone, body.customerPhone),
        eq(s.orders.source, 'haa_marketplace'),
      ))
      .limit(1);

    if (!row) {
      return c.json({
        success: false,
        error: { code: 'ORDER_LINK_FAILED', message: 'تعذر ربط أحد طلبات السوق بالطلب الموحد.' },
      }, 400);
    }

    const [existingLink] = await db.select({ marketplaceOrderId: s.marketplaceOrderLinks.marketplaceOrderId })
      .from(s.marketplaceOrderLinks)
      .where(eq(s.marketplaceOrderLinks.orderId, row.order.id))
      .limit(1);
    if (existingLink) {
      return c.json({
        success: false,
        error: { code: 'ORDER_ALREADY_LINKED', message: 'أحد طلبات السوق مرتبط مسبقاً بطلب موحد.' },
      }, 409);
    }

    links.push(row);
  }

  // ── Demo marketplace order safety check ──
  const storesWithDemo = links.map((link) => ({
    store: link.store,
    isDemo: link.store.isDemo,
  }));

  const hasDemoOrders = storesWithDemo.some((s) => s.isDemo === true);
  const hasRealOrders = storesWithDemo.some((s) => s.isDemo !== true);

  // Block mixed cart: demo + real products in same marketplace order
  if (hasDemoOrders && hasRealOrders) {
    return c.json({
      success: false,
      error: {
        code: 'MIXED_DEMO_REAL_MARKETPLACE_ORDER_NOT_ALLOWED',
        message: 'لا يمكن دمج منتجات المتاجر التجريبية والحقيقية في طلب سوق واحد.',
      },
    }, 400);
  }

  // For demo-only orders: use mock mode
  const isDemoOrder = hasDemoOrders && !hasRealOrders;

  const subtotal = links.reduce((sum, link) => sum + money(link.order.subtotal), 0);
  const shippingTotal = links.reduce((sum, link) => sum + money(link.order.shippingCost), 0);
  const total = links.reduce((sum, link) => sum + money(link.order.total), 0);
  const platformCommission = links.reduce((sum, link) => sum + money(link.order.platformCommission), 0);
  const marketplaceOrderNumber = generateMarketplaceOrderNumber();
  const paymentStatuses = new Set(links.map((link) => link.order.paymentStatus));
  const fulfillmentStatuses = new Set(links.map((link) => link.order.fulfillmentStatus));

  const created = await db.transaction(async (tx) => {
    const meta = isDemoOrder
      ? { subOrderCount: links.length, mode: 'demo', mockPaymentUsed: true }
      : { subOrderCount: links.length };

    const [marketplaceOrder] = await tx.insert(s.marketplaceOrders).values({
      marketplaceOrderNumber,
      status: isDemoOrder ? 'demo' : 'created',
      paymentStatus: isDemoOrder ? 'demo' : (paymentStatuses.size === 1 ? [...paymentStatuses][0] : 'mixed'),
      fulfillmentStatus: isDemoOrder ? 'demo' : (fulfillmentStatuses.size === 1 ? [...fulfillmentStatuses][0] : 'partial'),
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail ?? null,
      shippingAddress: (body.shippingAddress as Record<string, unknown>) ?? null,
      subtotal: subtotal.toString(),
      shippingTotal: shippingTotal.toString(),
      total: total.toString(),
      platformCommission: platformCommission.toString(),
      paymentMethod: isDemoOrder ? 'demo_mock' : (body.paymentMethod ?? null),
      notes: body.notes ?? null,
      metadata: meta as Record<string, unknown>,
    }).returning();

    for (const link of links) {
      await tx.insert(s.marketplaceOrderLinks).values({
        marketplaceOrderId: marketplaceOrder.id,
        orderId: link.order.id,
        storeId: link.store.id,
        storeName: link.store.name,
        storeSlug: link.store.slug,
        subtotal: money(link.order.subtotal).toString(),
        shippingCost: money(link.order.shippingCost).toString(),
        total: money(link.order.total).toString(),
        platformCommission: money(link.order.platformCommission).toString(),
      });

      const orderMeta = (link.order.metadata ?? {}) as Record<string, unknown>;
      await tx.update(s.orders)
        .set({
          metadata: isDemoOrder
            ? { ...orderMeta, marketplaceOrderNumber, marketplaceOrderId: marketplaceOrder.id, isMockOrder: true } as Record<string, unknown>
            : { ...orderMeta, marketplaceOrderNumber, marketplaceOrderId: marketplaceOrder.id } as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(s.orders.id, link.order.id));
    }

    return marketplaceOrder;
  });

  return c.json({
    success: true,
    data: {
      marketplaceOrderNumber: created.marketplaceOrderNumber,
      // TASK-0040 Track 1B — P0-3. Returned ONCE at order creation.
      // Customer must save it (UI copies to clipboard) to track later.
      // Mirrors support-ticket accessToken pattern (R-0014).
      accessToken: created.accessToken,
      status: created.status,
      paymentStatus: created.paymentStatus,
      fulfillmentStatus: created.fulfillmentStatus,
      subtotal: created.subtotal,
      shippingTotal: created.shippingTotal,
      total: created.total,
      platformCommission: created.platformCommission,
      mode: isDemoOrder ? 'demo' : 'live',
      subOrders: links.map((link) => ({
        storeName: link.store.name,
        storeSlug: link.store.slug,
        orderNumber: link.order.orderNumber,
        status: link.order.status,
        paymentStatus: link.order.paymentStatus,
        fulfillmentStatus: link.order.fulfillmentStatus,
        total: link.order.total,
      })),
    },
  }, 201);
});

haaMarketplaceRouter.get('/orders/:marketplaceOrderNumber', async (c) => {
  const marketplaceOrderNumber = c.req.param('marketplaceOrderNumber');
  // TASK-0098: close the legacy phone fallback. The access token is the
  // only public proof of ownership for marketplace order tracking.
  const accessToken = (c.req.query('access_token') ?? c.req.query('accessToken'))?.trim();
  if (!accessToken) {
    return c.json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'رمز الدخول مطلوب.' },
    }, 400);
  }

  const db = createDbClient();
  const [marketplaceOrder] = await db.select()
    .from(s.marketplaceOrders)
    .where(and(
      eq(s.marketplaceOrders.marketplaceOrderNumber, marketplaceOrderNumber),
      eq(s.marketplaceOrders.accessToken, accessToken),
    ))
    .limit(1);

  if (!marketplaceOrder) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'طلب السوق غير موجود.' } }, 404);
  }

  const subOrders = await db.select({
    link: s.marketplaceOrderLinks,
    order: s.orders,
  })
    .from(s.marketplaceOrderLinks)
    .innerJoin(s.orders, eq(s.marketplaceOrderLinks.orderId, s.orders.id))
    .where(eq(s.marketplaceOrderLinks.marketplaceOrderId, marketplaceOrder.id));

  return c.json({
    success: true,
    data: {
      marketplaceOrderNumber: marketplaceOrder.marketplaceOrderNumber,
      status: marketplaceOrder.status,
      paymentStatus: marketplaceOrder.paymentStatus,
      fulfillmentStatus: marketplaceOrder.fulfillmentStatus,
      customerName: marketplaceOrder.customerName,
      // Don't leak the full phone number in the tracking response.
      // Only return the accessToken as proof of ownership; the phone
      // is PII and should not be round-tripped through GET tracking.
      accessToken: marketplaceOrder.accessToken,
      subtotal: marketplaceOrder.subtotal,
      shippingTotal: marketplaceOrder.shippingTotal,
      total: marketplaceOrder.total,
      platformCommission: marketplaceOrder.platformCommission,
      createdAt: marketplaceOrder.createdAt,
      subOrders: subOrders.map(({ link, order }) => ({
        storeName: link.storeName,
        storeSlug: link.storeSlug,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        subtotal: link.subtotal,
        shippingCost: link.shippingCost,
        total: link.total,
      })),
    },
  });
});

export { haaMarketplaceRouter };
