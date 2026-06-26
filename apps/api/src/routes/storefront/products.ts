// Products, categories, brands, tags routes.

import { Hono } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import { createDbClient, withTenantContext } from '@haa/db';
import * as s from '@haa/db/schema';
import { ProductsService, PromotionsService } from '@haa/commerce-core';
import { paginationSchema } from '@haa/shared';
import { toPublicProduct, toPublicCategory } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore, getOfferEndDate } from './_shared.js';

type AnyRecord = Record<string, unknown>;

export const productsRouter = new Hono();

const SORT_VALUES = ['newest', 'price_asc', 'price_desc', 'name'] as const;
function parseSort(v: string | undefined): (typeof SORT_VALUES)[number] | undefined {
  return SORT_VALUES.includes(v as never) ? (v as (typeof SORT_VALUES)[number]) : undefined;
}
function parseNum(v: string | undefined): number | undefined {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

productsRouter.get('/:slug/products', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const query = paginationSchema.parse(c.req.query());

  // الفلاتر التي ترسلها الواجهة (كانت تُتجاهل سابقاً — QA C1).
  // `category` يصل كـ slug فنحوّله إلى categoryId.
  const categorySlug = c.req.query('category');
  let categoryId: number | undefined;
  if (categorySlug && categorySlug !== 'all') {
    const [cat] = await db
      .select({ id: s.categories.id })
      .from(s.categories)
      .where(and(eq(s.categories.storeId, store.id), eq(s.categories.slug, categorySlug)))
      .limit(1);
    categoryId = cat?.id;
  }

  const productsService = new ProductsService();
  const result = await productsService.list(store.id, {
    page: query.page,
    limit: query.limit,
    status: 'active',
    categoryId,
    brandId: parseNum(c.req.query('brandId')),
    tagId: parseNum(c.req.query('tagId')),
    search: c.req.query('search') || undefined,
    minPrice: parseNum(c.req.query('minPrice')),
    maxPrice: parseNum(c.req.query('maxPrice')),
    sort: parseSort(c.req.query('sort')),
  });

  const promotions = await new PromotionsService().getActiveForStore(store.id);
  const enrichedProducts = result.data.map((product: AnyRecord) => ({
    ...toPublicProduct(product),
    offerEndDate: getOfferEndDate(promotions, product),
  }));

  return c.json({ success: true, data: enrichedProducts, total: result.total, page: result.page, totalPages: result.totalPages });
});

productsRouter.get('/:slug/products/:productSlug', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const productSlug = c.req.param('productSlug');
  const db = createDbClient();

  // RLS-001 defense-in-depth: run the tenant-scoped read inside a tenant
  // context. The application-layer storeId filter below stays as layer 1
  // (the audited primary control); withTenantContext adds Postgres RLS as
  // layer 2 — active only when RLS_ENFORCE=on + migrations 002/003 applied,
  // otherwise a transparent pass-through (see packages/db/src/rls.ts).
  const product = await withTenantContext(
    db,
    { storeId: store.id, tenantId: store.tenantId },
    async (tx) =>
      (await tx.select().from(s.products).where(and(
        eq(s.products.storeId, store.id),
        eq(s.products.slug, productSlug),
        eq(s.products.status, 'active'),
      )).limit(1))[0] ?? null,
  );

  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المنتج غير موجود.' } }, 404);

  return c.json({ success: true, data: toPublicProduct(product) });
});

productsRouter.get('/:slug/categories', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const cats = await db.select().from(s.categories).where(eq(s.categories.storeId, store.id)).orderBy(asc(s.categories.sortOrder));
  return c.json({ success: true, data: cats.map(toPublicCategory) });
});

productsRouter.get('/:slug/brands', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const brands = await db.select().from(s.brands).where(eq(s.brands.storeId, store.id));
  // DTO عام — لا نسرّب storeId/tenantId/الطوابع الزمنية (QA C2).
  const data = brands.map((b: AnyRecord) => ({ id: b.id, name: b.name, slug: b.slug, logo: b.logo ?? null }));
  return c.json({ success: true, data });
});

productsRouter.get('/:slug/tags', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const tags = await db.select().from(s.tags).where(eq(s.tags.storeId, store.id));
  // DTO عام — لا نسرّب storeId/tenantId/الطوابع الزمنية (QA C2).
  const data = tags.map((t: AnyRecord) => ({ id: t.id, name: t.name, slug: t.slug, color: t.color ?? null }));
  return c.json({ success: true, data });
});
