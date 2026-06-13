import { Hono } from 'hono';
import { ReportsService } from '@haa/commerce-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const reportsRouter = new Hono();

reportsRouter.use('*', requireAuth(), requireStoreAccess());

reportsRouter.get('/sales-summary', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().salesSummary(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/top-products', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 10;
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().topProducts(storeId, limit, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/orders-by-status', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().ordersByStatus(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/sales-by-city', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().salesByCity(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/low-stock', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const threshold = c.req.query('threshold') ? Number(c.req.query('threshold')) : 5;
  const data = await new ReportsService().lowStock(storeId, threshold);
  return c.json({ success: true, data });
});

reportsRouter.get('/wallet-summary', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().walletSummary(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/deep', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const data = await new ReportsService().deepReport(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

reportsRouter.get('/export', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const auth = getAuth(c);

  const csv = await new ReportsService().exportSalesReport(storeId, dateFrom, dateTo);

  await new AuditLogService().record({
    actorUserId: auth!.userId,
    storeId,
    action: 'export_reports' as any,
    entityType: 'report',
    newValue: { dateFrom, dateTo },
  });

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="sales-report.csv"');
  return c.body(csv);
});

export { reportsRouter };
