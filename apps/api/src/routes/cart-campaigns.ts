import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { AbandonedCartCampaignService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const cartCampaignsRouter = new Hono();
cartCampaignsRouter.use('*', requireAuth(), requireStoreAccess());

const campaignStepSchema = z.object({
  step: z.number().int().min(1),
  channel: z.enum(['email', 'sms', 'whatsapp']),
  delayMinutes: z.number().int().min(1).max(10080),
  templateCode: z.string().max(100).optional().default('abandoned_cart'),
  messageBody: z.string().max(2000).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  steps: z.array(campaignStepSchema).min(1).max(5),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().positive().optional(),
  discountExpiresHours: z.number().int().min(1).max(720).optional(),
  minCartValue: z.number().min(0).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /campaigns — list campaigns
cartCampaignsRouter.get('/', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const service = new AbandonedCartCampaignService();
  const campaigns = await service.listCampaigns(storeId);
  return c.json({ success: true, data: campaigns });
});

// GET /campaigns/stats — aggregated recovery stats
cartCampaignsRouter.get('/stats', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const campaignId = c.req.query('campaignId') ? Number(c.req.query('campaignId')) : undefined;
  const service = new AbandonedCartCampaignService();
  const stats = await service.getStats(storeId, campaignId);
  return c.json({ success: true, data: stats });
});

// POST /campaigns — create campaign
cartCampaignsRouter.post('/', requirePermission('promotions:create'), zValidator('json', createCampaignSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const service = new AbandonedCartCampaignService();
  const campaign = await service.createCampaign(storeId, body);
  return c.json({ success: true, data: campaign }, 201);
});

// PUT /campaigns/:id — update campaign
cartCampaignsRouter.put('/:id', requirePermission('promotions:update'), zValidator('json', updateCampaignSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const service = new AbandonedCartCampaignService();
  const updated = await service.updateCampaign(id, storeId, body);
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } }, 404);
  return c.json({ success: true, data: updated });
});

// DELETE /campaigns/:id — delete campaign
cartCampaignsRouter.delete('/:id', requirePermission('promotions:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const service = new AbandonedCartCampaignService();
  await service.deleteCampaign(id, storeId);
  return c.json({ success: true });
});
