import { Hono } from 'hono';
import { DashboardService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const dashboardRouter = new Hono();

dashboardRouter.use('*', requireAuth(), requireStoreAccess());

dashboardRouter.get('/summary', requirePermission('dashboard:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new DashboardService().getSummary(storeId);
  return c.json({ success: true, data });
});

export { dashboardRouter };
