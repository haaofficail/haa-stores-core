import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, sql, desc, not } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { SallaService, ZidService, NoonService, AmazonService } from '@haa/marketplace-core';
import type { ProviderCode, ChannelOrder } from '@haa/marketplace-core';
import { sallaRouter } from './marketplaces/salla.js';
import { zidRouter } from './marketplaces/zid.js';
import { amazonRouter } from './marketplaces/amazon.js';

const marketplacesRouter = new Hono();

marketplacesRouter.use('*', requireAuth(), requireStoreAccess());

// Mount provider-specific sub-routers (extracted in Quality Pass 2 — Items 2.3/2.3b/2.3d).
// Salla, Zid, and Amazon have dedicated OAuth flows; Noon uses the
// generic /:provider/... dispatch routes so it does not need its
// own sub-router. The provider-agnostic routes below dispatch to
// any service via getProviderService(:provider, storeId).
marketplacesRouter.route('/salla', sallaRouter);
marketplacesRouter.route('/zid', zidRouter);
marketplacesRouter.route('/amazon', amazonRouter);

const codes = ['salla', 'zid', 'noon', 'amazon'] as const;

function parseProvider(p: string | undefined): ProviderCode {
  if (!p || !(codes as readonly string[]).includes(p)) throw new Error('Unsupported provider');
  return p as ProviderCode;
}

function getSallaService(storeId: number) {
  return new SallaService(storeId);
}

function getZidService(storeId: number) {
  return new ZidService(storeId);
}

function getNoonService(storeId: number) {
  return new NoonService(storeId);
}

function getAmazonService(storeId: number) {
  return new AmazonService(storeId);
}

export function getProviderService(providerCode: string, storeId: number) {
  switch (providerCode) {
    case 'salla': return getSallaService(storeId);
    case 'zid': return getZidService(storeId);
    case 'noon': return getNoonService(storeId);
    case 'amazon': return getAmazonService(storeId);
    default: return null;
  }
}

marketplacesRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const salla = getSallaService(storeId);

  let sallaConnected = false;
  let sallaStatus = 'disconnected';
  let zidConnected = false;
  let zidStatus = 'disconnected';
  let noonConnected = false;
  let noonStatus = 'disconnected';
  let amazonConnected = false;
  let amazonStatus = 'disconnected';

  try {
    const info = await salla.getStoreInfoFromConnection();
    if (info.storeId) { sallaConnected = true; sallaStatus = 'connected'; }
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  try {
    const info = await getZidService(storeId).getStoreInfoFromConnection();
    if (info.storeId) { zidConnected = true; zidStatus = 'connected'; }
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  try {
    const info = await getNoonService(storeId).getStoreInfo();
    if (info.storeId) { noonConnected = true; noonStatus = 'connected'; }
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  try {
    const info = await getAmazonService(storeId).getStoreInfo();
    if (info.storeId) { amazonConnected = true; amazonStatus = 'connected'; }
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  const providers = [
    { code: 'salla', name: 'سلة', connected: sallaConnected, status: sallaStatus },
    { code: 'zid', name: 'زد', connected: zidConnected, status: zidStatus },
    { code: 'noon', name: 'نون', connected: noonConnected, status: noonStatus },
    { code: 'amazon', name: 'أمازون', connected: amazonConnected, status: amazonStatus },
  ];

  return c.json({ success: true, data: providers });
});

// Amazon OAuth routes (GET /amazon/oauth/url, GET /amazon/oauth/callback)
// moved to ./marketplaces/amazon.ts (Item 2.3d).

marketplacesRouter.post(
  '/:provider/connect',
  requirePermission('settings:update'),
  zValidator('json', z.object({ credentials: z.record(z.unknown()) })),
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const storeId = Number(c.req.param('storeId'));

    if (provider === 'salla') {
      const url = getSallaService(storeId).getOAuthUrl(crypto.randomUUID());
      return c.json({ success: true, data: { requiresOAuth: true, url } });
    }

    if (provider === 'zid') {
      const url = getZidService(storeId).getOAuthUrl(crypto.randomUUID());
      return c.json({ success: true, data: { requiresOAuth: true, url } });
    }

    if (provider === 'noon') {
      const body = await c.req.json();
      const result = await getNoonService(storeId).connect(body.credentials || {});
      return c.json({ success: true, data: result });
    }

    if (provider === 'amazon') {
      const body = await c.req.json();
      const result = await getAmazonService(storeId).connect(body.credentials || {});
      return c.json({ success: true, data: result });
    }

    return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${provider} not yet implemented` } }, 501);
  },
);

marketplacesRouter.post('/:provider/disconnect', requirePermission('settings:update'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));

  try {
    if (provider === 'salla') await getSallaService(storeId).disconnect();
    if (provider === 'zid') await getZidService(storeId).disconnect();
    if (provider === 'noon') await getNoonService(storeId).disconnect();
    if (provider === 'amazon') await getAmazonService(storeId).disconnect();
    return c.json({ success: true, data: null });
  } catch (error) {
    return c.json({ success: false, error: { code: 'DISCONNECT_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.get('/:provider/info', requirePermission('settings:read'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));

  try {
    if (provider === 'salla') {
      const info = await getSallaService(storeId).getStoreInfoFromConnection();
      return c.json({ success: true, data: info });
    }
    if (provider === 'noon') {
      const info = await getNoonService(storeId).getStoreInfo();
      return c.json({ success: true, data: info });
    }
    if (provider === 'amazon') {
      const info = await getAmazonService(storeId).getStoreInfo();
      return c.json({ success: true, data: info });
    }
    return c.json({ success: true, data: { name: '', email: '', storeId: '' } });
  } catch (error) {
    return c.json({ success: false, error: { code: 'INFO_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.get('/:provider/listings', requirePermission('products:read'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));

  try {
    if (provider === 'salla') {
      const listings = await getSallaService(storeId).listProducts();
      return c.json({ success: true, data: listings });
    }
    if (provider === 'zid') {
      const listings = await getZidService(storeId).listProducts();
      return c.json({ success: true, data: listings });
    }
    if (provider === 'noon') {
      const listings = await getNoonService(storeId).listProducts();
      return c.json({ success: true, data: listings });
    }
    if (provider === 'amazon') {
      const listings = await getAmazonService(storeId).listProducts();
      return c.json({ success: true, data: listings });
    }
    return c.json({ success: true, data: [] });
  } catch (error) {
    return c.json({ success: false, error: { code: 'LISTINGS_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.post(
  '/:provider/listings',
  requirePermission('products:create'),
  zValidator('json', z.object({ name: z.string(), sku: z.string().optional(), price: z.string(), quantity: z.number().optional() })),
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const storeId = Number(c.req.param('storeId'));
    const data = c.req.valid('json');

    try {
      if (provider === 'salla') {
        const listing = await getSallaService(storeId).createProduct(data);
        return c.json({ success: true, data: listing }, 201);
      }
      if (provider === 'zid') {
        const listing = await getZidService(storeId).createProduct(data);
        return c.json({ success: true, data: listing }, 201);
      }
      if (provider === 'noon') {
        const listing = await getNoonService(storeId).createProduct(data);
        return c.json({ success: true, data: listing }, 201);
      }
      if (provider === 'amazon') {
        const listing = await getAmazonService(storeId).createProduct(data);
        return c.json({ success: true, data: listing }, 201);
      }
      return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${provider} not yet implemented` } }, 501);
    } catch (error) {
      return c.json({ success: false, error: { code: 'LISTING_CREATE_FAILED', message: (error as Error).message } }, 400);
    }
  },
);

marketplacesRouter.put(
  '/:provider/listings/:listingId',
  requirePermission('products:update'),
  zValidator('json', z.object({ price: z.string().optional(), quantity: z.number().optional() })),
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const storeId = Number(c.req.param('storeId'));
    const listingId = c.req.param('listingId') || '';
    const data = c.req.valid('json');

    try {
      if (provider === 'salla') {
        const listing = await getSallaService(storeId).updateProduct(listingId, data);
        return c.json({ success: true, data: listing });
      }
      if (provider === 'zid') {
        const listing = await getZidService(storeId).updateProduct(listingId, data);
        return c.json({ success: true, data: listing });
      }
      if (provider === 'noon') {
        const listing = await getNoonService(storeId).updateProduct(listingId, data);
        return c.json({ success: true, data: listing });
      }
      if (provider === 'amazon') {
        const listing = await getAmazonService(storeId).updateProduct(listingId, data);
        return c.json({ success: true, data: listing });
      }
      return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${provider} not yet implemented` } }, 501);
    } catch (error) {
      return c.json({ success: false, error: { code: 'LISTING_UPDATE_FAILED', message: (error as Error).message } }, 400);
    }
  },
);

marketplacesRouter.delete('/:provider/listings/:listingId', requirePermission('products:delete'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));
  const listingId = c.req.param('listingId') || '';

  try {
    if (provider === 'salla') {
      await getSallaService(storeId).deleteProduct(listingId);
    }
    if (provider === 'zid') {
      await getZidService(storeId).deleteProduct(listingId);
    }
    if (provider === 'noon') {
      await getNoonService(storeId).deleteProduct(listingId);
    }
    if (provider === 'amazon') {
      await getAmazonService(storeId).deleteProduct(listingId);
    }
    return c.json({ success: true, data: null });
  } catch (error) {
    return c.json({ success: false, error: { code: 'LISTING_DELETE_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.post('/:provider/sync/orders', requirePermission('orders:read'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));

  try {
    if (provider === 'salla') {
      const orders = await getSallaService(storeId).importOrders();
      return c.json({ success: true, data: orders });
    }
    if (provider === 'zid') {
      const orders = await getZidService(storeId).importOrders();
      return c.json({ success: true, data: orders });
    }
    if (provider === 'noon') {
      const orders = await getNoonService(storeId).importOrders();
      return c.json({ success: true, data: orders });
    }
    if (provider === 'amazon') {
      const orders = await getAmazonService(storeId).importOrders();
      return c.json({ success: true, data: orders });
    }
    return c.json({ success: true, data: [] });
  } catch (error) {
    return c.json({ success: false, error: { code: 'ORDERS_SYNC_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.post(
  '/:provider/sync/inventory',
  requirePermission('products:update'),
  zValidator('json', z.object({ items: z.array(z.object({ sku: z.string(), quantity: z.number() })) })),
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const storeId = Number(c.req.param('storeId'));
    const { items } = c.req.valid('json');

    try {
      if (provider === 'salla') {
        const result = await getSallaService(storeId).syncInventory(items);
        return c.json({ success: true, data: result });
      }
      if (provider === 'zid') {
        const result = await getZidService(storeId).syncInventory(items);
        return c.json({ success: true, data: result });
      }
      if (provider === 'noon') {
        const result = await getNoonService(storeId).syncInventory(items);
        return c.json({ success: true, data: result });
      }
      if (provider === 'amazon') {
        const result = await getAmazonService(storeId).syncInventory(items);
        return c.json({ success: true, data: result });
      }
      return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${provider} not yet implemented` } }, 501);
    } catch (error) {
      return c.json({ success: false, error: { code: 'INVENTORY_SYNC_FAILED', message: (error as Error).message } }, 400);
    }
  },
);

marketplacesRouter.post('/:provider/sync/products', requirePermission('products:read'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));

  try {
    if (provider === 'salla') {
      const products = await getSallaService(storeId).listProducts();
      return c.json({ success: true, data: products });
    }
    if (provider === 'zid') {
      const products = await getZidService(storeId).listProducts();
      return c.json({ success: true, data: products });
    }
    if (provider === 'noon') {
      const products = await getNoonService(storeId).listProducts();
      return c.json({ success: true, data: products });
    }
    if (provider === 'amazon') {
      const products = await getAmazonService(storeId).listProducts();
      return c.json({ success: true, data: products });
    }
    return c.json({ success: true, data: [] });
  } catch (error) {
    return c.json({ success: false, error: { code: 'PRODUCTS_SYNC_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.get('/:provider/sales', requirePermission('reports:read'), async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const storeId = Number(c.req.param('storeId'));
  const from = c.req.query('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = c.req.query('to') || new Date().toISOString();

  try {
    if (provider === 'salla') {
      const report = await getSallaService(storeId).getSalesReport(from, to);
      return c.json({ success: true, data: report });
    }
    if (provider === 'zid') {
      const report = await getZidService(storeId).getSalesReport(from, to);
      return c.json({ success: true, data: report });
    }
    if (provider === 'noon') {
      const report = await getNoonService(storeId).getSalesReport(from, to);
      return c.json({ success: true, data: report });
    }
    if (provider === 'amazon') {
      const report = await getAmazonService(storeId).getSalesReport(from, to);
      return c.json({ success: true, data: report });
    }
    return c.json({ success: true, data: { totalSales: '0', totalOrders: 0, currency: 'SAR', periodFrom: from, periodTo: to } });
  } catch (error) {
    return c.json({ success: false, error: { code: 'SALES_REPORT_FAILED', message: (error as Error).message } }, 400);
  }
});

marketplacesRouter.get('/summary', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  let sallaSales = '0';
  let sallaOrders = 0;
  try {
    const salla = getSallaService(storeId);
    const report = await salla.getSalesReport(from, to);
    sallaSales = report.totalSales;
    sallaOrders = report.totalOrders;
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  let noonSales = '0';
  let noonOrders = 0;
  try {
    const report = await getNoonService(storeId).getSalesReport(from, to);
    noonSales = report.totalSales;
    noonOrders = report.totalOrders;
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  let amazonSales = '0';
  let amazonOrders = 0;
  try {
    const report = await getAmazonService(storeId).getSalesReport(from, to);
    amazonSales = report.totalSales;
    amazonOrders = report.totalOrders;
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  let zidSales = '0';
  let zidOrders = 0;
  try {
    const report = await getZidService(storeId).getSalesReport(from, to);
    zidSales = report.totalSales;
    zidOrders = report.totalOrders;
  } catch (err) { console.warn('[marketplaces] probe failed:', (err as Error)?.message); }

  const summary = [
    { code: 'salla', name: 'سلة', totalSales: sallaSales, totalOrders: sallaOrders, currency: 'SAR' },
    { code: 'zid', name: 'زد', totalSales: zidSales, totalOrders: zidOrders, currency: 'SAR' },
    { code: 'noon', name: 'نون', totalSales: noonSales, totalOrders: noonOrders, currency: 'SAR' },
    { code: 'amazon', name: 'أمازون', totalSales: amazonSales, totalOrders: amazonOrders, currency: 'SAR' },
  ];

  return c.json({ success: true, data: summary });
});

marketplacesRouter.get('/hub', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();

  const connections = await db
    .select({
      id: s.marketplaceConnections.id,
      providerCode: s.marketplaceProviders.code,
      providerName: s.marketplaceProviders.name,
      isConnected: s.marketplaceConnections.isConnected,
      status: s.marketplaceConnections.status,
      storeName: s.marketplaceConnections.storeName,
      storeEmail: s.marketplaceConnections.storeEmail,
      externalStoreId: s.marketplaceConnections.externalStoreId,
      lastSyncAt: s.marketplaceConnections.lastSyncAt,
    })
    .from(s.marketplaceConnections)
    .innerJoin(
      s.marketplaceProviders,
      eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id),
    )
    .where(eq(s.marketplaceConnections.storeId, storeId));

  const connectionIds = connections.map(c => c.id);
  const listingCounts = connectionIds.length > 0
    ? await db
        .select({
          connectionId: s.channelListings.connectionId,
          count: sql<number>`count(*)::int`,
        })
        .from(s.channelListings)
        .where(and(
          eq(s.channelListings.storeId, storeId),
          sql`${s.channelListings.connectionId} IN ${connectionIds}`,
        ))
        .groupBy(s.channelListings.connectionId)
    : [];

  const codes = ['salla', 'zid', 'noon', 'amazon'] as const;
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date().toISOString();

  const salesPromises = codes.map(code => {
    switch (code) {
      case 'salla': return getSallaService(storeId).getSalesReport(from, to);
      case 'zid': return getZidService(storeId).getSalesReport(from, to);
      case 'noon': return getNoonService(storeId).getSalesReport(from, to);
      case 'amazon': return getAmazonService(storeId).getSalesReport(from, to);
      default: return Promise.reject(new Error('unknown provider'));
    }
  });

  const salesResults = await Promise.allSettled(salesPromises);

  const syncLogs = await db
    .select({
      id: s.syncLogs.id,
      providerCode: s.marketplaceProviders.code,
      providerName: s.marketplaceProviders.name,
      syncType: s.syncLogs.syncType,
      status: s.syncLogs.status,
      itemsSynced: s.syncLogs.itemsSynced,
      itemsFailed: s.syncLogs.itemsFailed,
      errorMessage: s.syncLogs.errorMessage,
      startedAt: s.syncLogs.startedAt,
      completedAt: s.syncLogs.completedAt,
    })
    .from(s.syncLogs)
    .innerJoin(
      s.marketplaceConnections,
      eq(s.syncLogs.connectionId, s.marketplaceConnections.id),
    )
    .innerJoin(
      s.marketplaceProviders,
      eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id),
    )
    .where(eq(s.syncLogs.storeId, storeId))
    .orderBy(sql`${s.syncLogs.startedAt} DESC`)
    .limit(10);

  const providers = codes.map((code, i) => {
    const conn = connections.find(c => c.providerCode === code);
    const sale = salesResults[i].status === 'fulfilled' ? salesResults[i].value : null;
    const listings = conn ? listingCounts.find(l => l.connectionId === conn.id) : null;
    return {
      code,
      name: conn?.providerName || code,
      isConnected: conn?.isConnected || false,
      status: conn?.status || 'disconnected',
      storeName: conn?.storeName || null,
      storeEmail: conn?.storeEmail || null,
      externalStoreId: conn?.externalStoreId || null,
      lastSyncAt: conn?.lastSyncAt || null,
      totalSales: sale?.totalSales || '0',
      totalOrders: sale?.totalOrders || 0,
      totalListings: listings?.count || 0,
      currency: sale?.currency || 'SAR',
    };
  });

  const connectedCount = providers.filter(p => p.isConnected).length;
  const totalSales = providers.reduce((sum, p) => sum + Number(p.totalSales), 0);
  const totalOrders = providers.reduce((sum, p) => sum + p.totalOrders, 0);

  return c.json({
    success: true,
    data: {
      summary: { totalSales: String(totalSales), totalOrders, connectedCount, activeCount: codes.length },
      providers,
      syncLogs,
    },
  });
});

// ─── Sync Log Helper ─────────────────────────────────────────
async function createSyncLog(
  db: ReturnType<typeof createDbClient>,
  storeId: number,
  connectionId: number,
  syncType: string,
  syncFn: () => Promise<{ itemsSynced: number; itemsFailed: number }>,
) {
  const [log] = await db.insert(s.syncLogs).values({
    storeId,
    connectionId,
    syncType,
    status: 'running',
    startedAt: new Date(),
  }).returning();

  try {
    const result = await syncFn();
    await db.update(s.syncLogs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        itemsSynced: result.itemsSynced,
        itemsFailed: result.itemsFailed,
      })
      .where(eq(s.syncLogs.id, log.id));

    await db.update(s.marketplaceConnections)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(s.marketplaceConnections.id, connectionId));

    return { ...result, logId: log.id, status: 'completed' as const };
  } catch (error) {
    await db.update(s.syncLogs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage: (error as Error).message,
      })
      .where(eq(s.syncLogs.id, log.id));

    return { itemsSynced: 0, itemsFailed: 0, logId: log.id, status: 'failed' as const, error: (error as Error).message };
  }
}

async function persistChannelOrders(storeId: number, connectionId: number, providerCode: string, orders: ChannelOrder[]) {
  const db = createDbClient();
  let imported = 0;
  for (const order of orders) {
    const [existing] = await db.select({ id: s.orders.id })
      .from(s.orders)
      .where(and(eq(s.orders.externalId, order.marketplaceOrderId), eq(s.orders.source, providerCode)))
      .limit(1);
    if (existing) continue;

    const orderNumber = `${providerCode.toUpperCase()}-${order.marketplaceOrderId.slice(-6)}`;
    const orderData = (order.orderData || {}) as Record<string, any>;
    await db.insert(s.orders).values({
      storeId,
      orderNumber,
      status: order.status === 'cancelled' ? 'cancelled' : 'confirmed',
      paymentStatus: order.status === 'cancelled' ? 'unpaid' : 'paid',
      fulfillmentStatus: 'unfulfilled',
      customerName: order.customerName || providerCode,
      customerPhone: orderData.phone || '0000000000',
      customerEmail: orderData.email || null,
      subtotal: order.totalAmount,
      total: order.totalAmount,
      source: providerCode,
      externalId: order.marketplaceOrderId,
      createdAt: new Date(order.orderedAt),
    });
    imported++;
  }
  return imported;
}

// ─── Sync All ─────────────────────────────────────────────────
marketplacesRouter.post('/sync-all', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();

  const connections = await db
    .select({
      id: s.marketplaceConnections.id,
      providerCode: s.marketplaceProviders.code,
    })
    .from(s.marketplaceConnections)
    .innerJoin(
      s.marketplaceProviders,
      eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id),
    )
    .where(and(
      eq(s.marketplaceConnections.storeId, storeId),
      eq(s.marketplaceConnections.isConnected, true),
    ));

  if (connections.length === 0) {
    return c.json({ success: true, data: { results: [] } });
  }

  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      const service = conn.providerCode === 'salla' ? getSallaService(storeId)
        : conn.providerCode === 'zid' ? getZidService(storeId)
        : conn.providerCode === 'noon' ? getNoonService(storeId)
        : getAmazonService(storeId);

      const ordersResult = await createSyncLog(db, storeId, conn.id, 'orders', async () => {
        const orders = await service.importOrders();
        const imported = await persistChannelOrders(storeId, conn.id, conn.providerCode, orders);
        return { itemsSynced: imported, itemsFailed: orders.length - imported };
      });

      return { providerCode: conn.providerCode, ordersResult };
    }),
  );

  const syncResults = results.map(r =>
    r.status === 'fulfilled' ? r.value : { providerCode: 'unknown', ordersResult: { itemsSynced: 0, itemsFailed: 0, status: 'failed' as const, error: (r as PromiseRejectedResult).reason?.message } },
  );

  const totalSynced = syncResults.reduce((sum, r) => sum + r.ordersResult.itemsSynced, 0);
  const totalFailed = syncResults.reduce((sum, r) => sum + r.ordersResult.itemsFailed, 0);

  return c.json({
    success: true,
    data: { results: syncResults, totalSynced, totalFailed },
  });
});

// ─── Sync Logs (paginated) ────────────────────────────────────
marketplacesRouter.get('/sync-logs', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(50, Math.max(10, Number(c.req.query('limit')) || 20));
  const offset = (page - 1) * limit;
  const typeFilter = c.req.query('type'); // optional: orders, products, inventory

  const whereConditions = [eq(s.syncLogs.storeId, storeId)];
  if (typeFilter) whereConditions.push(eq(s.syncLogs.syncType, typeFilter));

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(s.syncLogs)
    .where(and(...whereConditions));

  const logs = await db
    .select({
      id: s.syncLogs.id,
      providerCode: s.marketplaceProviders.code,
      providerName: s.marketplaceProviders.name,
      syncType: s.syncLogs.syncType,
      status: s.syncLogs.status,
      itemsSynced: s.syncLogs.itemsSynced,
      itemsFailed: s.syncLogs.itemsFailed,
      errorMessage: s.syncLogs.errorMessage,
      startedAt: s.syncLogs.startedAt,
      completedAt: s.syncLogs.completedAt,
    })
    .from(s.syncLogs)
    .innerJoin(
      s.marketplaceConnections,
      eq(s.syncLogs.connectionId, s.marketplaceConnections.id),
    )
    .innerJoin(
      s.marketplaceProviders,
      eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id),
    )
    .where(and(...whereConditions))
    .orderBy(desc(s.syncLogs.startedAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    },
  });
});

// ─── Publish Product to Marketplace ───────────────────────────
marketplacesRouter.post(
  '/:provider/publish',
  requirePermission('products:create'),
  zValidator('json', z.object({
    productId: z.number(),
    price: z.string().optional(),
    quantity: z.number().optional(),
  })),
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const storeId = Number(c.req.param('storeId'));
    const { productId, price: overridePrice, quantity: overrideQty } = c.req.valid('json');
    const db = createDbClient();

    const [product] = await db.select()
      .from(s.products)
      .where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId)))
      .limit(1);

    if (!product) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المنتج غير موجود' } }, 404);
    }

    const publishData: Record<string, unknown> = {
      name: product.name,
      sku: product.sku || product.slug,
      price: overridePrice || product.price.toString(),
      quantity: overrideQty ?? product.stockQuantity ?? 0,
    };

    try {
      let result: any;
      if (provider === 'salla') result = await getSallaService(storeId).createProduct(publishData);
      else if (provider === 'noon') result = await getNoonService(storeId).createProduct(publishData);
      else if (provider === 'amazon') result = await getAmazonService(storeId).createProduct(publishData);
      else if (provider === 'zid') result = await getZidService(storeId).createProduct(publishData);
      else return c.json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: `${provider} not yet implemented` } }, 501);

      const existingChannels = (product.marketplaceChannels || {}) as Record<string, any>;
      existingChannels[provider] = {
        productId: result?.marketplaceProductId || result?.id || 'unknown',
        url: result?.marketplaceUrl,
        price: publishData.price as string,
        status: 'active',
      };
      await db.update(s.products)
        .set({ marketplaceChannels: existingChannels, updatedAt: new Date() })
        .where(eq(s.products.id, productId));

      return c.json({ success: true, data: result }, 201);
    } catch (error) {
      return c.json({ success: false, error: { code: 'PUBLISH_FAILED', message: (error as Error).message } }, 400);
    }
  },
);

export { marketplacesRouter };

export async function syncAllStores() {
  const db = createDbClient();
  const stores = await db.select({ id: s.stores.id }).from(s.stores).where(eq(s.stores.isActive, true));

  for (const store of stores) {
    try {
      const connections = await db
        .select({ id: s.marketplaceConnections.id, providerCode: s.marketplaceProviders.code })
        .from(s.marketplaceConnections)
        .innerJoin(s.marketplaceProviders, eq(s.marketplaceConnections.providerId, s.marketplaceProviders.id))
        .where(and(eq(s.marketplaceConnections.storeId, store.id), eq(s.marketplaceConnections.isConnected, true)));

      if (connections.length === 0) continue;

      await Promise.allSettled(
        connections.map(async (conn) => {
          const service = conn.providerCode === 'salla' ? getSallaService(store.id)
            : conn.providerCode === 'zid' ? getZidService(store.id)
            : conn.providerCode === 'noon' ? getNoonService(store.id)
            : getAmazonService(store.id);

          await createSyncLog(db, store.id, conn.id, 'orders', async () => {
            const orders = await service.importOrders();
            const imported = await persistChannelOrders(store.id, conn.id, conn.providerCode, orders);
            return { itemsSynced: imported, itemsFailed: orders.length - imported };
          });
        }),
      );
    } catch (err) { console.warn('[marketplaces] operation failed:', (err as Error)?.message); }
  }
}
