import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { ApiKeyService } from '@haa/integration-core';
import { toPublicProduct, toPublicOrder } from '@haa/shared/dto/storefront-dto';

interface ApiKeyMeta {
  storeId: number;
  keyId: number;
  scopes: string[];
}

type PublicApiScope = 'products:read' | 'orders:read' | 'orders:create';

interface PublicApiEnv {
  Variables: {
    apiKeyMeta: ApiKeyMeta;
  };
}

const publicApiRouter = new Hono<PublicApiEnv>();

const requireApiKeyScope = (scope: PublicApiScope) => async (c: Context<PublicApiEnv>, next: Next) => {
  const meta = c.get('apiKeyMeta');
  if (!meta.scopes.includes(scope)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient scope' } }, 403);
  }
  await next();
};

publicApiRouter.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } }, 401);

  const keyService = new ApiKeyService();
  const key = await keyService.validateKey(apiKey);
  if (!key) return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);

  c.set('apiKeyMeta', { storeId: key.storeId, keyId: key.id, scopes: key.scopes });
  await next();
});

publicApiRouter.get('/products', requireApiKeyScope('products:read'), async (c) => {
  const meta = c.get('apiKeyMeta');
  const db = createDbClient();
  const products = await db.select().from(s.products).where(eq(s.products.storeId, meta.storeId)).limit(50);
  return c.json({ success: true, data: products.map(toPublicProduct) });
});

publicApiRouter.get('/orders', requireApiKeyScope('orders:read'), async (c) => {
  const meta = c.get('apiKeyMeta');
  const db = createDbClient();
  const orders = await db.select().from(s.orders).where(eq(s.orders.storeId, meta.storeId)).limit(50);
  return c.json({ success: true, data: orders.map(toPublicOrder) });
});

publicApiRouter.post('/orders', requireApiKeyScope('orders:create'), async (c) => {
  return c.json({ success: true, data: { message: 'Order creation via API is available' } });
});

export { publicApiRouter };
