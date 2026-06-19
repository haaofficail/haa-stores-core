import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { WhatsAppCampaignService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const whatsappCampaignsRouter = new Hono();
whatsappCampaignsRouter.use('*', requireAuth(), requireStoreAccess());

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  segmentType: z.enum([
    'high_value', 'repeat_buyers', 'new_customers', 'inactive',
    'cart_abandoners', 'at_risk', 'one_time_buyers', 'coupon_users',
  ]).optional(),
  messageTemplate: z.string().min(1).max(1000),
  scheduledAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

// GET /whatsapp-campaigns
whatsappCampaignsRouter.get('/', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const campaigns = await new WhatsAppCampaignService().listCampaigns(storeId);
  return c.json({ success: true, data: campaigns });
});

// GET /whatsapp-campaigns/preview — estimate recipients before sending
whatsappCampaignsRouter.get('/preview', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const segmentType = c.req.query('segmentType') as Parameters<WhatsAppCampaignService['previewRecipients']>[1];
  const preview = await new WhatsAppCampaignService().previewRecipients(storeId, segmentType);
  return c.json({ success: true, data: preview });
});

// POST /whatsapp-campaigns — create campaign (draft)
whatsappCampaignsRouter.post('/', requirePermission('promotions:create'), zValidator('json', createCampaignSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const campaign = await new WhatsAppCampaignService().createCampaign(storeId, body);
  return c.json({ success: true, data: campaign }, 201);
});

// POST /whatsapp-campaigns/:id/send — trigger send now
whatsappCampaignsRouter.post('/:id/send', requirePermission('promotions:create'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  // Send is async — kick off and return accepted
  new WhatsAppCampaignService().sendCampaign(id, storeId).catch(err => {
    console.error(`[whatsapp-campaigns] send failed campaign ${id}:`, err);
  });
  return c.json({ success: true, message: 'Campaign send started' }, 202);
});

// DELETE /whatsapp-campaigns/:id — delete draft/failed campaign
whatsappCampaignsRouter.delete('/:id', requirePermission('promotions:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  await new WhatsAppCampaignService().deleteCampaign(id, storeId);
  return c.json({ success: true });
});
