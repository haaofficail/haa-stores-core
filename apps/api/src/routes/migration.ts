import { Hono } from 'hono';
import { requireAuth, requireStoreAccess } from '@haa/auth-core';

const migrationRouter = new Hono();
migrationRouter.use('*', requireAuth(), requireStoreAccess());

migrationRouter.get('/template/csv', async (c) => {
  const csv = 'name,slug,price,stock_quantity,sku,description\nProduct Name,product-slug,99.99,100,SKU001,Product description\n';
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="migration-template.csv"');
  return c.body(csv);
});

export { migrationRouter };
