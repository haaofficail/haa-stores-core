// Products, categories, brands, tags routes.

import { Hono } from 'hono';
import { eq, and, asc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { ProductsService, CategoriesService, BrandsService, TagsService, PromotionsService } from '@haa/commerce-core';
import { paginationSchema } from '@haa/shared';
import { toPublicProduct, toPublicProducts, toPublicCategory } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore, getOfferEndDate } from './_shared.js';

type AnyRecord = Record<string, unknown>;

export const productsRouter = new Hono();

productsRouter.get('/:slug/products', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const query = paginationSchema.parse(c.req.query());

  const productsService = new ProductsService();
  const result = await productsService.list(store.id, {
    page: query.page,
    limit: query.limit,
    status: 'active',
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

  const [product] = await db.select().from(s.products).where(and(
    eq(s.products.storeId, store.id),
    eq(s.products.slug, productSlug),
    eq(s.products.status, 'active'),
  )).limit(1);

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
  return c.json({ success: true, data: brands });
});

productsRouter.get('/:slug/tags', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const tags = await db.select().from(s.tags).where(eq(s.tags.storeId, store.id));
  return c.json({ success: true, data: tags });
});
