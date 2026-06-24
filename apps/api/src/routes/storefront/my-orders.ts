// Public "my orders" endpoint.
//
// GET /:slug/orders?phone=05XXXXXXXX → list of the customer's recent
// orders for this store. Replaces the "I forgot my order number"
// dead-end customers used to hit on the order-tracking page.
//
// SECURITY:
//   - Phone is the identifier (no auth). Same pattern as
//     /:slug/track/:orderNumber — the customer proves ownership by
//     knowing the phone they checked out with.
//   - Unknown phone returns empty list, NEVER 404. No enumeration
//     leak — looks identical to a customer who has no orders yet.
//   - Response carries ONLY the public-safe order fields. Internal
//     wallet/audit fields are filtered out at the dto-mapping layer
//     when (and only when) we extend `toPublicOrder` to handle the
//     list case — for now we project a tight subset inline.
//   - Hard cap of 50 results per call. The storefront UI shows the
//     most recent 20; paginated history is a future enhancement.

import { Hono } from 'hono';
import { OrdersService } from '@haa/commerce-core';
import { resolveActiveStore } from './_shared.js';

export const myOrdersRouter = new Hono();

myOrdersRouter.get('/:slug/orders', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const phone = c.req.query('phone');
  if (!phone || phone.trim().length === 0) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } },
      400,
    );
  }
  const orders = await new OrdersService().listForCustomerPhonePublic(store.id, phone, 50);
  // Tight public projection — avoid leaking wallet/audit metadata.
  const publicOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    total: o.total,
    currency: 'SAR' as const, // storefront is KSA-only today; multi-currency = future
    itemsCount: null as number | null, // populated by detail endpoint, not list
    createdAt:
      o.createdAt instanceof Date
        ? o.createdAt.toISOString()
        : String(o.createdAt),
  }));
  return c.json({ success: true, data: publicOrders });
});
