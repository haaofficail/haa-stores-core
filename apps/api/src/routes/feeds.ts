import { Hono } from 'hono';
import { ProductFeedService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const feedsRouter = new Hono();
feedsRouter.use('*', requireAuth(), requireStoreAccess());

feedsRouter.get('/google-merchant', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const feed = await new ProductFeedService().generateGoogleMerchantFeed(storeId);
  c.header('Content-Type', 'text/tab-separated-values');
  c.header('Content-Disposition', 'attachment; filename="google-merchant-feed.txt"');
  return c.body(feed);
});

feedsRouter.get('/meta-catalog', requirePermission('exports:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const feed = await new ProductFeedService().generateMetaCatalogFeed(storeId);
  c.header('Content-Type', 'application/json');
  c.header('Content-Disposition', 'attachment; filename="meta-catalog-feed.json"');
  return c.body(feed);
});

feedsRouter.get('/templates', requirePermission('imports:create'), async (c) => {
  const templates = await new ProductFeedService().getMigrationTemplates();
  return c.json({ success: true, data: templates });
});

feedsRouter.get('/template/:source/csv', requirePermission('imports:create'), async (c) => {
  const source = c.req.param('source');
  const templates = await new ProductFeedService().getMigrationTemplates();
  const tpl = templates.find((t: { source: string }) => t.source === source);
  if (!tpl) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } }, 404);
  const csv = tpl.templateColumns.join(',');
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="${source}-template.csv"`);
  return c.body(csv);
});

export { feedsRouter };
