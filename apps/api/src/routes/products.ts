import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { ProductsService } from '@haa/commerce-core';
import { AuditLogService, WebhookOutboxService } from '@haa/integration-core';
import { createProductSchema, updateProductSchema, paginationSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { getProviderService } from './marketplaces';

const productsRouter = new Hono();

productsRouter.use('*', requireAuth(), requireStoreAccess());

async function getStoreTenantId(storeId: number): Promise<number | null> {
  const db = createDbClient();
  const [store] = await db.select({ tenantId: s.stores.tenantId })
    .from(s.stores)
    .where(eq(s.stores.id, storeId))
    .limit(1);
  return store?.tenantId ?? null;
}

async function autoPublishProduct(storeId: number, productId: number, productData: any) {
  const db = createDbClient();
  const connections = await db.select({
    id: s.marketplaceConnections.id,
    code: s.marketplaceProviders.code,
  })
    .from(s.marketplaceConnections)
    .innerJoin(s.marketplaceProviders, eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id))
    .where(and(eq(s.marketplaceConnections.storeId, storeId), eq(s.marketplaceConnections.isConnected, true)));

  if (connections.length === 0) return;

  const existingChannels: Record<string, any> = productData?.marketplaceChannels || {};
  const channels: Record<string, { productId: string; url?: string; price?: string; status?: string }> = { ...existingChannels };
  const errors: string[] = [];

  for (const conn of connections) {
    const providerCode = conn.code;
    if (!providerCode) continue;

    try {
      const service = getProviderService(providerCode, storeId);
      if (!service) continue;

      const existingListing = existingChannels[providerCode];

      let result: any;
      if (existingListing?.productId) {
        result = await (service as any).updateProduct(existingListing.productId, {
          name: productData.name,
          sku: productData.sku || productData.slug,
          price: productData.price?.toString?.() || productData.price,
          quantity: productData.stockQuantity ?? 0,
        });
      } else {
        result = await (service as any).createProduct({
          name: productData.name,
          sku: productData.sku || productData.slug,
          price: productData.price?.toString?.() || productData.price,
          quantity: productData.stockQuantity ?? 0,
        });
      }

      channels[providerCode] = {
        productId: result?.marketplaceProductId || result?.id || existingListing?.productId || 'unknown',
        url: result?.marketplaceUrl || existingListing?.url,
        price: productData.price?.toString?.() || productData.price,
        status: 'active',
      };
    } catch (err: any) {
      errors.push(`${providerCode}: ${err.message}`);
      if (existingChannels[providerCode]) {
        channels[providerCode] = { ...existingChannels[providerCode], status: 'error' };
      }
    }
  }

  if (Object.keys(channels).length > 0) {
    await db.update(s.products)
      .set({ marketplaceChannels: channels, updatedAt: new Date() })
      .where(eq(s.products.id, productId));
  }

  return { channels, errors };
}

async function recordMarketplaceSyncFailure(
  storeId: number,
  productId: number,
  actorUserId: number | null | undefined,
  details: Record<string, unknown>,
) {
  const tenantId = await getStoreTenantId(storeId);
  await Promise.allSettled([
    new AuditLogService().record({
      actorUserId: actorUserId ?? null,
      storeId,
      action: 'product_marketplace_sync_failed',
      entityType: 'product',
      entityId: productId,
      newValue: details,
    }),
    tenantId
      ? new WebhookOutboxService().recordEvent('product.marketplace_sync_failed', storeId, tenantId, {
        productId,
        ...details,
      })
      : Promise.resolve(),
  ]);
}

function autoPublishProductWithAudit(storeId: number, productId: number, productData: any, actorUserId?: number | null) {
  autoPublishProduct(storeId, productId, productData)
    .then(async (result) => {
      if (!result?.errors?.length) return;
      await recordMarketplaceSyncFailure(storeId, productId, actorUserId, { errors: result.errors, channels: result.channels });
    })
    .catch(async (err: any) => {
      await recordMarketplaceSyncFailure(storeId, productId, actorUserId, { error: err?.message ?? 'Unknown marketplace sync error' });
    });
}

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

productsRouter.post('/', requirePermission('products:create'), zValidator('json', createProductSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const body = c.req.valid('json');
  const product = await new ProductsService().create(storeId, body);
  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_created',
    entityType: 'product',
    entityId: product.id,
    newValue: { id: product.id, name: product.name, status: product.status },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  if (product?.id && body.status === 'active') {
    autoPublishProductWithAudit(storeId, product.id, product, auth?.userId);
  }
  return c.json({ success: true, data: product }, 201);
});

productsRouter.patch('/:productId', requirePermission('products:update'), zValidator('json', updateProductSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const auth = getAuth(c);
  const body = c.req.valid('json');
  const existing = await new ProductsService().getById(storeId, productId);
  const product = await new ProductsService().update(storeId, productId, body);
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_updated',
    entityType: 'product',
    entityId: productId,
    oldValue: existing ? { name: existing.name, status: existing.status, price: existing.price } : null,
    newValue: { id: product.id, name: product.name, status: product.status, price: product.price },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  if (existing?.status === 'active' || body.status === 'active') {
    autoPublishProductWithAudit(storeId, productId, { ...existing, ...body }, auth?.userId);
  }
  return c.json({ success: true, data: product });
});

productsRouter.post('/bulk', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const body = await c.req.json();
  const { productIds, action } = body;
  if (!Array.isArray(productIds) || !productIds.length || !['activate', 'deactivate'].includes(action)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productIds array and action (activate|deactivate) are required' } }, 400);
  }
  const result = await new ProductsService().bulkAction(storeId, productIds.map(Number), action);
  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_bulk_updated',
    entityType: 'product',
    entityId: null,
    newValue: { action, productIds: productIds.map(Number), result },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: result });
});

productsRouter.delete('/:productId', requirePermission('products:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const auth = getAuth(c);
  const product = await new ProductsService().archive(storeId, productId);
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_archived',
    entityType: 'product',
    entityId: productId,
    newValue: { id: product.id, name: product.name, status: product.status },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: product });
});

productsRouter.post('/:productId/images', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const auth = getAuth(c);

  const body = await c.req.parseBody();
  const file = body['image'] as File | undefined;
  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image file is required' } }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = await new ProductsService().addImage(storeId, productId, buffer, file.type);
  if (!image) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  }

  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_image_uploaded',
    entityType: 'product_image',
    entityId: image.id,
    newValue: { productId, url: image.url },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  return c.json({ success: true, data: image }, 201);
});

productsRouter.delete('/:productId/images/:imageId', requirePermission('products:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const productId = Number(c.req.param('productId'));
  const imageId = Number(c.req.param('imageId'));
  const auth = getAuth(c);

  const image = await new ProductsService().deleteImage(storeId, productId, imageId);
  if (!image) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Image not found' } }, 404);
  }

  await new AuditLogService().record({
    actorUserId: auth?.userId ?? null,
    storeId,
    action: 'product_image_deleted',
    entityType: 'product_image',
    entityId: imageId,
    oldValue: { productId, url: image.url },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  return c.json({ success: true, data: image });
});

export { productsRouter };
