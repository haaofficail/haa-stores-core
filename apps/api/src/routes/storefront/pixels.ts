import { Hono } from 'hono';
import { PixelService } from '@haa/commerce-core';
import { createDbClient } from '@haa/db';
import { eq } from 'drizzle-orm';
import * as s from '@haa/db/schema';

export const pixelsPublicRouter = new Hono();

/**
 * GET /s/pixels?slug=:storeSlug
 * Public endpoint — fetches pixel tracking scripts for a store by slug.
 * Used by the storefront to inject analytics tags.
 * Short-lived cache (60s) to minimise DB load without stale configs.
 */
pixelsPublicRouter.get('/pixels', async (c) => {
  const slug = c.req.query('slug');
  if (!slug) return c.json({ success: false, error: { code: 'MISSING_SLUG', message: 'slug required' } }, 400);

  const db = createDbClient();
  const [store] = await db.select({ id: s.stores.id })
    .from(s.stores)
    .where(eq(s.stores.slug, slug))
    .limit(1);

  if (!store) return c.json({ success: true, data: { headScripts: '', bodyScripts: '' } });

  const service = new PixelService(db);
  const config = await service.getConfig(store.id);
  if (!config || !config.isActive) {
    return c.json({ success: true, data: { headScripts: '', bodyScripts: '' } });
  }

  const scripts = service.buildScripts(config);
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({ success: true, data: scripts });
});
