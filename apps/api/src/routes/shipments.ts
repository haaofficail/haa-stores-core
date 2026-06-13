import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { OrdersService } from '@haa/commerce-core';
import { ShippingService, LabelService, ReturnService, createShippingProvider, getShippingProviderStatus } from '@haa/shipping-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const shipmentsRouter = new Hono();
shipmentsRouter.use('*', requireAuth(), requireStoreAccess());

// GET /merchant/:storeId/shipping/provider-status
shipmentsRouter.get('/provider-status', async (c) => {
  return c.json({ success: true, data: getShippingProviderStatus() });
});

// GET /merchant/:storeId/shipments
shipmentsRouter.get('/', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status');
  const result = await new ShippingService().listShipments(storeId, { status });
  return c.json({ success: true, data: result });
});

// GET /merchant/:storeId/shipments/returns/list — Must come BEFORE /:id
shipmentsRouter.get('/returns/list', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const returns = await new ReturnService().listReturns(storeId);
  return c.json({ success: true, data: returns });
});

// GET /merchant/:storeId/shipments/:id
shipmentsRouter.get('/:id', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const shipment = await new ShippingService().getShipment(storeId, id);
  if (!shipment) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: shipment });
});

// POST /merchant/:storeId/orders/:orderId/shipments — Create shipment
shipmentsRouter.post('/orders/:orderId/shipments', requirePermission('shipping:manage'), zValidator('json', z.object({
  shippingMethodId: z.number(),
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(1),
  address: z.object({
    street: z.string().optional(),
    district: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(1),
  }),
  notes: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const db = createDbClient();

  try {
    const order = await new OrdersService(db).getById(storeId, orderId);
    if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    if (order.status === 'cancelled' || order.status === 'returned') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Cannot ship cancelled/returned order' } }, 400);
    }
    if (!order.customerPhone && !body.recipientPhone) {
      return c.json({ success: false, error: { code: 'MISSING_ADDRESS', message: 'Recipient phone required' } }, 400);
    }

    const shippingService = new ShippingService(db);
    const result = await shippingService.createShipment(storeId, orderId, {
      shippingMethodId: body.shippingMethodId,
      recipientName: body.recipientName,
      recipientPhone: body.recipientPhone || order.customerPhone || '',
      address: body.address,
      notes: body.notes,
      items: [],
      shippingCost: 0,
      customerFee: 0,
      merchantCost: 0,
      platformCost: 0,
    });

    return c.json({ success: true, data: result }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Shipment creation failed';
    return c.json({ success: false, error: { code: 'SHIPMENT_ERROR', message: msg } }, 400);
  }
});

// POST /merchant/:storeId/shipments/:shipmentId/label — Create label
shipmentsRouter.post('/:shipmentId/label', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  try {
    const result = await new ShippingService().createLabel(storeId, shipmentId);
    if (!result) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
    return c.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Label creation failed';
    return c.json({ success: false, error: { code: 'LABEL_ERROR', message: msg } }, 400);
  }
});

// GET /merchant/:storeId/shipments/:shipmentId/label — Get label
shipmentsRouter.get('/:shipmentId/label', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  const label = await new LabelService().getLabel(shipmentId, storeId);
  if (!label) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Label not found' } }, 404);
  return c.json({ success: true, data: label });
});

// PATCH /merchant/:storeId/shipments/:shipmentId/status — Update shipment status
shipmentsRouter.patch('/:shipmentId/status', requirePermission('shipping:manage'), zValidator('json', z.object({
  status: z.string().min(1),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  carrierName: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  const body = c.req.valid('json');
  const updated = await new ShippingService().updateShipmentStatus(storeId, shipmentId, body);
  if (!updated) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: updated });
});

// POST /merchant/:storeId/shipments/:shipmentId/events — Add tracking event
shipmentsRouter.post('/:shipmentId/events', requirePermission('shipping:manage'), zValidator('json', z.object({
  status: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  const body = c.req.valid('json');
  const event = await new ShippingService().addTrackingEvent(storeId, shipmentId, body);
  if (!event) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
  return c.json({ success: true, data: event }, 201);
});

// POST /merchant/:storeId/shipments/:shipmentId/return — Create return
shipmentsRouter.post('/:shipmentId/return', requirePermission('shipping:manage'), zValidator('json', z.object({
  reason: z.string().min(1).max(500),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  const body = c.req.valid('json');
  try {
    const db = createDbClient();
    const [shipment] = await db.select().from(s.shipments).where(
      and(eq(s.shipments.id, shipmentId), eq(s.shipments.storeId, storeId))
    ).limit(1);
    if (!shipment) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Shipment not found' } }, 404);
    const result = await new ReturnService().createReturn(storeId, shipment.orderId, shipmentId, body.reason);
    return c.json({ success: true, data: result }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Return creation failed';
    return c.json({ success: false, error: { code: 'RETURN_ERROR', message: msg } }, 400);
  }
});

// POST /merchant/:storeId/shipments/:shipmentId/cancel — Cancel shipment
shipmentsRouter.post('/:shipmentId/cancel', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  try {
    const provider = createShippingProvider();
    await provider.cancelShipment(shipmentId, storeId);
    return c.json({ success: true, data: { message: 'Shipment cancelled' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Cancel failed';
    return c.json({ success: false, error: { code: 'CANCEL_ERROR', message: msg } }, 400);
  }
});

export { shipmentsRouter };
