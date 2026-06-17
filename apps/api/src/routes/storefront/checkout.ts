// Shipping, checkout, payment, orders routes for the public storefront.
//
// 3DS handling (SAMA mandatory):
// - Card payments (moyasar, geidea) that require 3-D Secure go through the
//   storefront Checkout.tsx which calls the provider directly with the
//   publishable key. When the provider returns a 3DS challenge URL
//   (`source.transaction_url` for Moyasar), the storefront redirects the
//   customer to the issuer's challenge page.
// - After 3DS completion, the customer is redirected back to the storefront.
//   The storefront then calls the relevant confirm endpoint, which is
//   responsible for updating the local payment status from 'requires_3ds'
//   to 'paid' (or 'failed') based on the provider's response.
// - For BNPL payments (tabby, tamara), there is no 3DS — the BNPL provider
//   handles its own authentication. The `payment-session` endpoint below
//   returns a `redirectUrl` for the BNPL redirect, separate from the 3DS flow.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  CheckoutService,
  OrdersService,
  CouponsService,
  CartService,
  createPaymentProvider,
} from '@haa/commerce-core';
import { ManualShippingProvider } from '@haa/shipping-core';
import { ALLOWED_PAYMENT_METHODS, AppError } from '@haa/shared';
import { toPublicOrder, toPublicShippingMethod } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore } from './_shared.js';

export const checkoutRouter = new Hono();

const shippingRatesSchema = z.object({
  cartId: z.string().uuid(),
  city: z.string(),
});

const couponSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative().optional(),
});

const checkoutSessionSchema = z.object({
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
  }).optional(),
  shippingMethodId: z.coerce.number().optional(),
  paymentMethod: z.enum(ALLOWED_PAYMENT_METHODS as unknown as [string, ...string[]]),
  notes: z.string().optional(),
  idempotencyKey: z.string().uuid(),
  couponCode: z.string().optional(),
  fulfillmentType: z.enum(['shipping', 'local_pickup']).optional(),
  pickupLocationId: z.coerce.number().optional(),
  gift: z.object({
    sendAsGift: z.boolean().optional(),
    message: z.string().max(1000).optional(),
  }).optional(),
});

const paymentSessionSchema = z.object({
  sessionId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  failureUrl: z.string().url().optional(),
});

checkoutRouter.get('/:slug/shipping-methods', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const methods = await db
    .select()
    .from(s.shippingMethods)
    .where(eq(s.shippingMethods.storeId, store.id));
  return c.json({ success: true, data: methods.map((m: any) => toPublicShippingMethod(m)) });
});

checkoutRouter.post('/:slug/checkout/shipping-rates', zValidator('json', shippingRatesSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const cart = await new CartService().getCart(store.id, body.cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  const provider = new ManualShippingProvider();
  const rates = await provider.calculateRates({
    storeId: store.id,
    items: (cart.items ?? []).map((i: any) => ({
      weightGrams: i.product?.weightGrams,
      quantity: i.item?.quantity,
      requiresShipping: i.product?.requiresShipping,
    })),
    destination: { city: body.city, country: 'Saudi Arabia' },
    subtotal: cart.subtotal,
  });
  return c.json({ success: true, data: rates });
});

checkoutRouter.post('/:slug/checkout/validate-coupon', zValidator('json', couponSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const couponService = new CouponsService();
  const validation = await couponService.validate(store.id, body.code, Number(body.subtotal));
  if (!validation.valid) {
    return c.json({ success: true, data: { valid: false, reason: validation.reason } });
  }
  const discount = couponService.calculateDiscount(validation.coupon, Number(body.subtotal), Number(body.shippingCost ?? 0));
  return c.json({ success: true, data: { valid: true, discount, code: validation.coupon.code, couponId: validation.coupon.id } });
});

checkoutRouter.post('/:slug/checkout/sessions', zValidator('json', checkoutSessionSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  try {
    const sessionResult = await new CheckoutService().createSession(store.id, body);
    const { session, idempotent } = sessionResult as any;
    return c.json({ success: true, data: { ...session, idempotent } }, idempotent ? 200 : 201);
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'CHECKOUT_ERROR', e instanceof Error ? e.message : 'Checkout failed');
  }
});

checkoutRouter.post('/:slug/checkout/payment-session', zValidator('json', paymentSessionSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const slug = c.req.param('slug') as string;
  const body = c.req.valid('json');
  try {
    const proto = c.req.header('x-forwarded-proto') || 'https';
    const host = c.req.header('host') || '';
    const callbackBase = `${proto}://${host}/s/${slug}/checkout/payments/callback`;

    const bnplResult = await new CheckoutService().initiateBNPLPayment(store.id, body.sessionId, {
      frontendSuccessUrl: body.successUrl,
      frontendCancelUrl: body.cancelUrl,
      frontendFailureUrl: body.failureUrl,
      callbackSuccessUrl: `${callbackBase}?status=success`,
      callbackCancelUrl: `${callbackBase}?status=cancelled`,
      callbackFailureUrl: `${callbackBase}?status=failed`,
    });
    return c.json({ success: true, data: { redirectUrl: bnplResult.redirectUrl, paymentId: bnplResult.paymentId, order: toPublicOrder(bnplResult.order as any) } });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'BNPL_SESSION_ERROR', e instanceof Error ? e.message : 'BNPL payment initiation failed');
  }
});

checkoutRouter.get('/:slug/checkout/payments/callback', async (c) => {
  const slug = c.req.param('slug') as string;
  const store = await (await import('./_shared.js')).resolveStore(slug);
  if (!store) return c.redirect('/?error=store_not_found');

  const paymentId = c.req.query('payment_id') as string | undefined;
  const orderId = c.req.query('order_id') as string | undefined;
  const providerPaymentId = paymentId || orderId;
  if (!providerPaymentId) return c.redirect('/?error=missing_payment_id');

  try {
    const result = await new CheckoutService().handleBNPLCallback(store.id, providerPaymentId);
    const baseUrl = result.redirectUrl || '/';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const finalUrl = (result as any).orderNumber ? `${baseUrl}${separator}orderNumber=${(result as any).orderNumber}` : baseUrl;
    return c.redirect(finalUrl);
  } catch {
    return c.redirect('/?error=callback_failed');
  }
});

checkoutRouter.post('/:slug/checkout/sessions/:sessionId/confirm', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const sessionId = c.req.param('sessionId') as string | undefined;
  if (!sessionId) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Session ID required' } }, 400);
  try {
    const confirmResult = await new CheckoutService().confirm(store.id, sessionId, undefined, c.req.header('x-forwarded-for'));
    return c.json({ success: true, data: { ...confirmResult, order: toPublicOrder(((confirmResult as any).order as any) ?? {}) } });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'CONFIRM_ERROR', e instanceof Error ? e.message : 'Confirmation failed');
  }
});

checkoutRouter.get('/:slug/order/:orderNumber', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  const order = await new OrdersService().getByOrderNumber(store.id, orderNumber);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as any) });
});

checkoutRouter.get('/:slug/track/:orderNumber', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  const phone = c.req.query('phone');
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const order = await new OrdersService().getByOrderNumberPublic(orderNumber, phone);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as any) });
});
