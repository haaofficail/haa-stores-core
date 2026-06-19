import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ShipmentsService, OutboundWebhookService, type ShipmentsResult } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const shipmentsRouter = new Hono();
shipmentsRouter.use('*', requireAuth(), requireStoreAccess());

/**
 * Map a ShipmentsService result envelope to an HTTP
 * response. Keeps the route pure transport and centralizes
 * the success/error → status-code mapping.
 */
function toResponse<T>(c: any, result: ShipmentsResult<T>, successStatus: 200 | 201) {
  if (result.success) {
    return c.json({ success: true, data: result.data }, successStatus);
  }
  // Map service error codes to HTTP status codes. The
  // contract is preserved: same codes the route used to
  // return before the migration.
  let httpStatus: 400 | 404 = 400;
  if (result.code === 'NOT_FOUND') httpStatus = 404;
  return c.json(
    { success: false, error: { code: result.code, message: result.message } },
    httpStatus,
  );
}

// GET /merchant/:storeId/shipping/provider-status
shipmentsRouter.get('/provider-status', async (c) => {
  return c.json({ success: true, data: new ShipmentsService().getProviderStatus() });
});

// GET /merchant/:storeId/shipments
shipmentsRouter.get('/', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status');
  return toResponse(c, await new ShipmentsService().listShipments(storeId, { status }), 200);
});

// GET /merchant/:storeId/shipments/returns/list — Must come BEFORE /:id
shipmentsRouter.get('/returns/list', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  return toResponse(c, await new ShipmentsService().listReturns(storeId), 200);
});

// GET /merchant/:storeId/shipments/:id
shipmentsRouter.get('/:id', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  return toResponse(c, await new ShipmentsService().getShipment(storeId, id), 200);
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
  const result = await new ShipmentsService().createShipment(storeId, orderId, body);
  if (result.success && result.data) {
    new OutboundWebhookService().emit(storeId, 'shipment.created', {
      shipmentId: (result.data as any).id,
      orderId,
    }).catch(() => null);
  }
  return toResponse(c, result, 201);
});

// POST /merchant/:storeId/shipments/:shipmentId/label — Create label
shipmentsRouter.post('/:shipmentId/label', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  return toResponse(c, await new ShipmentsService().createLabel(storeId, shipmentId), 200);
});

// GET /merchant/:storeId/shipments/:shipmentId/label — Get label
shipmentsRouter.get('/:shipmentId/label', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  return toResponse(c, await new ShipmentsService().getLabel(storeId, shipmentId), 200);
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
  const result = await new ShipmentsService().updateStatus(storeId, shipmentId, body);
  if (result.success && body.status === 'delivered') {
    new OutboundWebhookService().emit(storeId, 'shipment.delivered', {
      shipmentId,
      trackingNumber: body.trackingNumber,
    }).catch(() => null);
  }
  return toResponse(c, result, 200);
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
  return toResponse(c, await new ShipmentsService().addTrackingEvent(storeId, shipmentId, body), 201);
});

// POST /merchant/:storeId/shipments/:shipmentId/return — Create return
shipmentsRouter.post('/:shipmentId/return', requirePermission('shipping:manage'), zValidator('json', z.object({
  reason: z.string().min(1).max(500),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  const body = c.req.valid('json');
  return toResponse(c, await new ShipmentsService().createReturn(storeId, shipmentId, body), 201);
});

// POST /merchant/:storeId/shipments/:shipmentId/cancel — Cancel shipment
shipmentsRouter.post('/:shipmentId/cancel', requirePermission('shipping:manage'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const shipmentId = Number(c.req.param('shipmentId'));
  return toResponse(c, await new ShipmentsService().cancel(storeId, shipmentId), 200);
});

export { shipmentsRouter };
