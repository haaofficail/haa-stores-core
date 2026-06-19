import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { OutboundWebhookService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { randomBytes } from 'crypto';

export const outboundWebhooksRouter = new Hono();
outboundWebhooksRouter.use('*', requireAuth(), requireStoreAccess());

const createEndpointSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.string().max(100)).min(1),
  secret: z.string().min(16).max(255).optional(),
});

const updateEndpointSchema = createEndpointSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /outbound-webhooks/endpoints
outboundWebhooksRouter.get('/endpoints', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const endpoints = await new OutboundWebhookService().listEndpoints(storeId);
  return c.json({ success: true, data: endpoints.map(e => ({ ...e, secret: e.secret ? '••••••••' : null })) });
});

// POST /outbound-webhooks/endpoints
outboundWebhooksRouter.post('/endpoints', requirePermission('settings:update'), zValidator('json', createEndpointSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const secret = body.secret ?? randomBytes(32).toString('hex');
  const endpoint = await new OutboundWebhookService().createEndpoint(storeId, { url: body.url, events: body.events, secret });
  return c.json({ success: true, data: { ...endpoint, secret } }, 201);
});

// PUT /outbound-webhooks/endpoints/:id
outboundWebhooksRouter.put('/endpoints/:id', requirePermission('settings:update'), zValidator('json', updateEndpointSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const updated = await new OutboundWebhookService().updateEndpoint(id, storeId, body);
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404);
  return c.json({ success: true, data: { ...updated, secret: updated.secret ? '••••••••' : null } });
});

// DELETE /outbound-webhooks/endpoints/:id
outboundWebhooksRouter.delete('/endpoints/:id', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  await new OutboundWebhookService().deleteEndpoint(id, storeId);
  return c.json({ success: true });
});

// POST /outbound-webhooks/endpoints/:id/rotate-secret
outboundWebhooksRouter.post('/endpoints/:id/rotate-secret', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const newSecret = await new OutboundWebhookService().rotateSecret(id, storeId);
  return c.json({ success: true, data: { secret: newSecret } });
});

// POST /outbound-webhooks/endpoints/:id/unpause
outboundWebhooksRouter.post('/endpoints/:id/unpause', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  await new OutboundWebhookService().unpauseEndpoint(id, storeId);
  return c.json({ success: true });
});

// GET /outbound-webhooks/endpoints/:id/health
outboundWebhooksRouter.get('/endpoints/:id/health', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const endpoint = await new OutboundWebhookService().getEndpointHealth(id, storeId);
  if (!endpoint) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404);
  return c.json({
    success: true,
    data: {
      id: endpoint.id,
      url: endpoint.url,
      isActive: endpoint.isActive,
      isPaused: endpoint.pausedUntil ? endpoint.pausedUntil > new Date() : false,
      pausedUntil: endpoint.pausedUntil,
      consecutiveFailures: endpoint.consecutiveFailures,
      totalDeliveries: endpoint.totalDeliveries,
      totalFailures: endpoint.totalFailures,
      successRate: endpoint.totalDeliveries > 0
        ? `${(((endpoint.totalDeliveries - endpoint.totalFailures) / endpoint.totalDeliveries) * 100).toFixed(1)}%`
        : 'N/A',
    },
  });
});

// GET /outbound-webhooks/events
outboundWebhooksRouter.get('/events', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status');
  const limit = Math.min(Number(c.req.query('limit') || 50), 200);
  const events = await new OutboundWebhookService().listEvents(storeId, { status, limit });
  return c.json({ success: true, data: events });
});

// GET /outbound-webhooks/events/:id/deliveries
outboundWebhooksRouter.get('/events/:id/deliveries', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const deliveries = await new OutboundWebhookService().listDeliveries(id, storeId);
  return c.json({ success: true, data: deliveries });
});

// POST /outbound-webhooks/events/:id/replay
outboundWebhooksRouter.post('/events/:id/replay', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  await new OutboundWebhookService().replay(id, storeId);
  return c.json({ success: true });
});
