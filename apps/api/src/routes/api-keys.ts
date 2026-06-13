import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { ApiKeyService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const apiKeysRouter = new Hono();
apiKeysRouter.use('*', requireAuth(), requireStoreAccess());

apiKeysRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const keys = await new ApiKeyService().listKeys(storeId);
  return c.json({ success: true, data: keys });
});

apiKeysRouter.post('/', requirePermission('settings:update'), zValidator('json', z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { name, scopes } = c.req.valid('json');
  const key = await new ApiKeyService().createKey(storeId, name, scopes);
  return c.json({ success: true, data: key }, 201);
});

apiKeysRouter.delete('/:keyId', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const keyId = Number(c.req.param('keyId'));
  await new ApiKeyService().revokeKey(storeId, keyId);
  return c.json({ success: true, data: { revoked: true } });
});

apiKeysRouter.get('/scopes', requirePermission('settings:read'), async (c) => {
  const scopes = await new ApiKeyService().getScopes();
  return c.json({ success: true, data: scopes });
});

apiKeysRouter.get('/logs', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const logs = await db.select().from(s.integrationLogs)
    .where(eq(s.integrationLogs.storeId, storeId))
    .orderBy(desc(s.integrationLogs.createdAt))
    .limit(100);
  return c.json({ success: true, data: logs });
});

export { apiKeysRouter };
