import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { PixelService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const pixelsRouter = new Hono();
pixelsRouter.use('*', requireAuth(), requireStoreAccess());

const pixelConfigSchema = z.object({
  metaPixelId: z.string().max(50).optional().nullable(),
  tiktokPixelId: z.string().max(50).optional().nullable(),
  snapchatPixelId: z.string().max(50).optional().nullable(),
  twitterPixelId: z.string().max(50).optional().nullable(),
  ga4MeasurementId: z.string().max(50).optional().nullable(),
  gtmContainerId: z.string().max(50).optional().nullable(),
  pinterestTagId: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /pixels — get store pixel config
pixelsRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const config = await new PixelService().getConfig(storeId);
  return c.json({ success: true, data: config });
});

// PUT /pixels — upsert pixel config
pixelsRouter.put('/', requirePermission('settings:update'), zValidator('json', pixelConfigSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const config = await new PixelService().upsertConfig(storeId, body);
  return c.json({ success: true, data: config });
});

// GET /pixels/scripts — preview generated scripts (for debugging)
pixelsRouter.get('/scripts', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const service = new PixelService();
  const config = await service.getConfig(storeId);
  if (!config) return c.json({ success: true, data: { headScripts: '', bodyScripts: '' } });
  const scripts = service.buildScripts(config);
  return c.json({ success: true, data: scripts });
});
