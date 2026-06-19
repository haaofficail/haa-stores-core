import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ProductsService, MarketplaceSyncService } from '@haa/commerce-core';
import { createProductSchema, updateProductSchema, paginationSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { getProviderService } from './marketplaces.js';

const productsRouter = new Hono();

productsRouter.use('*', requireAuth(), requireStoreAccess());

productsRouter.get('/', requirePermission('products:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const query = paginationSchema.parse(c.req.query());
  const status = c.req.query('status');
  const categoryId = c.req.query('categoryId') ? Number(c.req.query('categoryId')) : undefined;
  const brandId = c.req.query('brandId') ? Number(c.req.query('brandId')) : undefined;
  const tagId = c.req.query('tagId') ? Number(c.req.query('tagId')) : undefined;
  const search = c.req.query('search');
  const rawStockFilter = c.req.query('stockFilter');
  const rawTypeFilter = c.req.query('typeFilter');
  const stockFilter = rawStockFilter && ['in_stock', 'low_stock', 'out_of_stock'].includes(rawStockFilter as string)
    ? rawStockFilter as 'in_stock' | 'low_stock' | 'out_of_stock' : undefined;
  const typeFilter = rawTypeFilter && ['simple', 'variants'].includes(rawTypeFilter as string)
    ? rawTypeFilter as 'simple' | 'variants' : undefined;
  const result = await new ProductsService().list(storeId, {
    page: query.page, limit: query.limit, status, categoryId, brandId, tagId, search, stockFilter, typeFilter,
  });
  return c.json({ success: true, data: result });
});

productsRouter.get('/:productId', requirePermission('products:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const product = await new ProductsService().getById(storeId, productId);
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  return c.json({ success: true, data: product });
});

function buildAuditCtx(c: any) {
  const auth = getAuth(c);
  return {
    actorUserId: auth?.userId ?? null,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}

productsRouter.post('/', requirePermission('products:create'), zValidator('json', createProductSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const body = c.req.valid('json');
  const product = await new ProductsService().create(storeId, body, buildAuditCtx(c));
  if (product?.id && body.status === 'active') {
    new MarketplaceSyncService().scheduleAutoPublish(storeId, {
      productId: product.id,
      productData: product,
      actorUserId: auth?.userId,
      providerResolver: (code) => getProviderService(code, storeId) as any,
    });
  }
  return c.json({ success: true, data: product }, 201);
});

productsRouter.patch('/:productId', requirePermission('products:update'), zValidator('json', updateProductSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const auth = getAuth(c);
  const body = c.req.valid('json');
  const existing = await new ProductsService().getById(storeId, productId);
  const product = await new ProductsService().update(storeId, productId, body, buildAuditCtx(c));
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  if (existing?.status === 'active' || body.status === 'active') {
    new MarketplaceSyncService().scheduleAutoPublish(storeId, {
      productId,
      productData: { ...existing, ...body },
      actorUserId: auth?.userId,
      providerResolver: (code) => getProviderService(code, storeId) as any,
    });
  }
  return c.json({ success: true, data: product });
});

productsRouter.post('/bulk', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = await c.req.json();
  const { productIds, action } = body;
  if (!Array.isArray(productIds) || !productIds.length || !['activate', 'deactivate'].includes(action)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productIds array and action (activate|deactivate) are required' } }, 400);
  }
  const result = await new ProductsService().bulkAction(storeId, productIds.map(Number), action, buildAuditCtx(c));
  return c.json({ success: true, data: result });
});

productsRouter.delete('/:productId', requirePermission('products:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const product = await new ProductsService().archive(storeId, productId, buildAuditCtx(c));
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  return c.json({ success: true, data: product });
});

productsRouter.post('/:productId/images', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));

  const body = await c.req.parseBody();
  const file = body['image'] as File | undefined;
  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image file is required' } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await new ProductsService().addImage(storeId, productId, buffer, file.type, undefined, buildAuditCtx(c));
  if (!image) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  }

  return c.json({ success: true, data: image }, 201);
});

productsRouter.delete('/:productId/images/:imageId', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const imageId = Number(c.req.param('imageId'));

  const image = await new ProductsService().deleteImage(storeId, productId, imageId, buildAuditCtx(c));
  if (!image) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } }, 404);
  }

  return c.json({ success: true, data: image });
});

export { productsRouter };
