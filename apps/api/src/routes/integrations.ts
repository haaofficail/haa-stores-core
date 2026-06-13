import { Hono } from 'hono';
import { ApiKeyService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const integrationsRouter = new Hono();
integrationsRouter.use('*', requireAuth(), requireStoreAccess());

integrationsRouter.get('/api-keys', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const keys = await new ApiKeyService().listKeys(storeId);
  return c.json({ success: true, data: keys });
});

export { integrationsRouter };
