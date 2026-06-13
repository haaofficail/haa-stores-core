import { Hono } from 'hono';
import { ExportsService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const exportsRouter = new Hono();

exportsRouter.use('*', requireAuth(), requireStoreAccess());

exportsRouter.get('/products', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const csv = await new ExportsService().exportProducts(storeId);

  await new ExportsService().logExport(storeId, auth!.userId, 'products', csv.split('\n').length - 1);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="products.csv"');
  return c.body(csv);
});

exportsRouter.get('/orders', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const status = c.req.query('status');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  const svc = new ExportsService();
  const csv = await svc.exportOrders(storeId, { status, dateFrom, dateTo });

  await svc.logExport(storeId, auth!.userId, 'orders', csv.split('\n').length - 1);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="orders.csv"');
  return c.body(csv);
});

exportsRouter.get('/customers', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const svc = new ExportsService();
  const csv = await svc.exportCustomers(storeId);

  await svc.logExport(storeId, auth!.userId, 'customers', csv.split('\n').length - 1);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="customers.csv"');
  return c.body(csv);
});

exportsRouter.get('/wallet', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  const svc = new ExportsService();
  const csv = await svc.exportWallet(storeId, { dateFrom, dateTo });

  await svc.logExport(storeId, auth!.userId, 'wallet', csv.split('\n').length - 1);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="wallet.csv"');
  return c.body(csv);
});

export { exportsRouter };
