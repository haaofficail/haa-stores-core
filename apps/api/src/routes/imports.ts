import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ImportsService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const importsRouter = new Hono();

importsRouter.use('*', requireAuth(), requireStoreAccess());

const csvContentSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
});

importsRouter.post('/products/preview', requirePermission('imports:create'), zValidator('json', csvContentSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { csvContent } = c.req.valid('json');
  const result = await new ImportsService().previewProducts(storeId, csvContent);
  return c.json({ success: true, data: result });
});

importsRouter.post('/products/confirm', requirePermission('imports:create'), zValidator('json', csvContentSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const { csvContent } = c.req.valid('json');
  const result = await new ImportsService().importProducts(storeId, csvContent, auth!.userId);
  return c.json({ success: true, data: result });
});

importsRouter.get('/products/template', requirePermission('imports:create'), async (c) => {
  const csv = await new ImportsService().downloadTemplate('products');
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="product-import-template.csv"');
  return c.body(csv);
});

export { importsRouter };
