import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ShippingService, getDefaultShippingRateCache } from '@haa/shipping-core';
import { AuditLogService } from '@haa/integration-core';
import { createShippingMethodSchema, createShippingZoneSchema, createShippingRateSchema, updateShipmentStatusSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const shippingRouter = new Hono();

shippingRouter.use('*', requireAuth(), requireStoreAccess());

shippingRouter.get('/overview', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const overview = await new ShippingService().getOverview(storeId);
  return c.json({ success: true, data: overview });
});

// Diagnostics: process-wide rate-cache stats. Useful when an operator wants
// to verify the cache is actually absorbing the checkout-page rate calls
// before chasing a "shipping API quota exceeded" alert.
shippingRouter.get('/rate-cache/stats', requirePermission('shipping:manage'), (c) => {
  const stats = getDefaultShippingRateCache().stats();
  return c.json({ success: true, data: stats });
});

shippingRouter.get('/methods', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const methods = await new ShippingService().listMethods(storeId);
  return c.json({ success: true, data: methods });
});

shippingRouter.post('/methods', requirePermission('shipping:manage'), zValidator('json', createShippingMethodSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const method = await new ShippingService().createMethod(storeId, body);
  return c.json({ success: true, data: method }, 201);
});

shippingRouter.put('/methods/:id', requirePermission('shipping:manage'), zValidator('json', createShippingMethodSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const method = await new ShippingService().updateMethod(storeId, id, body);
  if (!method) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Method not found' } }, 404);
  await new AuditLogService().record({
    actorUserId: getAuth(c)?.userId ?? null,
    tenantId: getAuth(c)?.tenantId ?? null,
    storeId,
    action: 'shipping_settings_changed',
    entityType: 'shipping',
    entityId: id,
    oldValue: { methodId: id },
    newValue: body,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: method });
});

shippingRouter.get('/zones', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const zones = await new ShippingService().listZones(storeId);
  return c.json({ success: true, data: zones });
});

shippingRouter.post('/zones', requirePermission('shipping:manage'), zValidator('json', createShippingZoneSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const zone = await new ShippingService().createZone(storeId, body);
  return c.json({ success: true, data: zone }, 201);
});

shippingRouter.put('/zones/:id', requirePermission('shipping:manage'), zValidator('json', createShippingZoneSchema.partial()), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const zone = await new ShippingService().updateZone(storeId, id, body);
  if (!zone) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Zone not found' } }, 404);
  return c.json({ success: true, data: zone });
});

shippingRouter.get('/rates', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const rates = await new ShippingService().listRates(storeId);
  return c.json({ success: true, data: rates });
});

shippingRouter.post('/rates', requirePermission('shipping:manage'), zValidator('json', createShippingRateSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  const rate = await new ShippingService().createRate(storeId, body);
  return c.json({ success: true, data: rate }, 201);
});

shippingRouter.get('/shipments', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status');
  const noTracking = c.req.query('noTracking') === 'true';
  const city = c.req.query('city');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const shipments = await new ShippingService().listShipments(storeId, { status, noTracking, city, dateFrom, dateTo });
  return c.json({ success: true, data: shipments });
});

shippingRouter.get('/shipments/:id', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const shipment = await new ShippingService().getShipment(storeId, id);
  if (!shipment) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: shipment });
});

shippingRouter.patch('/shipments/:id/tracking', requirePermission('shipping:manage'), zValidator('json', z.object({
  trackingNumber: z.string().min(1).max(100),
  trackingUrl: z.string().url().optional(),
  carrierName: z.string().max(100).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const shipment = await new ShippingService().updateShipmentStatus(storeId, id, { status: 'in_transit', ...body });
  if (!shipment) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: shipment });
});

shippingRouter.patch('/shipments/:id/status', requirePermission('shipping:manage'), zValidator('json', updateShipmentStatusSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const shipment = await new ShippingService().updateShipmentStatus(storeId, id, body);
  if (!shipment) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: shipment });
});

export { shippingRouter };
