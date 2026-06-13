import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { CheckoutService, createPaymentProvider, getAvailablePaymentMethods } from '@haa/commerce-core';
import { ALLOWED_PAYMENT_METHODS } from '@haa/shared';
import { requireAuth, requireStoreAccess, getAuth } from '@haa/auth-core';

const checkoutRouter = new Hono();

checkoutRouter.use('*', requireAuth(), requireStoreAccess());

checkoutRouter.post('/sessions', zValidator('json', z.object({
  cartId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.object({
    street: z.string().optional(),
    district: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }),
  shippingMethodId: z.coerce.number(),
  paymentMethod: z.enum(ALLOWED_PAYMENT_METHODS),
  notes: z.string().optional(),
  idempotencyKey: z.string().uuid(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  try {
    const result = await new CheckoutService().createSession(storeId, body);
    return c.json({ success: true, data: result }, result.idempotent ? 200 : 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Checkout failed';
    return c.json({ success: false, error: { code: 'CHECKOUT_ERROR', message } }, 400);
  }
});

checkoutRouter.post('/sessions/:sessionId/confirm', async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const sessionId = c.req.param('sessionId');
  const auth = getAuth(c);
  try {
    const result = await new CheckoutService().confirm(storeId, sessionId, auth?.userId);
    return c.json({ success: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Confirmation failed';
    return c.json({ success: false, error: { code: 'CONFIRM_ERROR', message } }, 400);
  }
});

export { checkoutRouter };
