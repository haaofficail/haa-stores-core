import { Hono } from 'hono';
import { ProviderStatusService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const providerStatusRouter = new Hono();

providerStatusRouter.use('*', requireAuth(), requireStoreAccess());

providerStatusRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const service = new ProviderStatusService();
  const data = await service.getStatus(storeId);
  return c.json({ success: true, data });
});

export { providerStatusRouter };
