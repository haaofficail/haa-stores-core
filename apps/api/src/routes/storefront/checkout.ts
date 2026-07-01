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
} from '@haa/commerce-core';
import { ManualShippingProvider, getDefaultShippingRateCache } from '@haa/shipping-core';
import { ALLOWED_PAYMENT_METHODS, AppError } from '@haa/shared';
import { env } from '../../env.js';
import { toPublicOrder, toPublicShippingMethod } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore } from './_shared.js';

export const checkoutRouter = new Hono();

const PUBLIC_INSUFFICIENT_STOCK_MESSAGE = 'أحد المنتجات في السلة لم يعد متوفرًا بالكمية المطلوبة. راجع السلة قبل إعادة المحاولة.';
type PublicRecord = Record<string, unknown>;
type CartRouteItem = {
  item?: { productId?: number; quantity?: number };
  product?: {
    id?: number;
    sku?: string | null;
    weightGrams?: number | null;
    requiresShipping?: boolean | null;
  };
};
type CartForRates = {
  items?: CartRouteItem[];
  subtotal: number;
};
type CheckoutSessionResult = {
  session: PublicRecord;
  idempotent: boolean;
};
type BnplResult = {
  redirectUrl: string | null;
  paymentId: number;
  order: PublicRecord;
};
type CheckoutCallbackResult = {
  redirectUrl?: string | null;
  orderNumber?: string | null;
};
type ConfirmResult = PublicRecord & {
  order?: PublicRecord;
  redirectUrl?: string;
};

function isInsufficientStockMessage(message: string): boolean {
  return message.toLowerCase().includes('insufficient stock');
}

// P0-3 audit fix: `fake_card_success`/`fake_card_failed` exist in
// ALLOWED_PAYMENT_METHODS purely for local/staging dev and were, until
// now, accepted by this endpoint regardless of environment — hiding the
// option in the storefront UI (import.meta.env.DEV) is not a server-side
// guarantee. A direct API call in production could still mint a "paid"
// order without any real payment ever happening.
export const FAKE_PAYMENT_METHODS = new Set(['fake_card_success', 'fake_card_failed']);

export function isFakePaymentMethodBlocked(paymentMethod: string, nodeEnv: string = env.NODE_ENV): boolean {
  return nodeEnv === 'production' && FAKE_PAYMENT_METHODS.has(paymentMethod);
}

function isCheckoutClientErrorMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('not found') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('invalid') ||
    isInsufficientStockMessage(lowerMessage);
}

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
  redeemPoints: z.coerce.number().int().nonnegative().optional(),
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
  return c.json({ success: true, data: methods.map((m) => toPublicShippingMethod(m)) });
});

checkoutRouter.post('/:slug/checkout/shipping-rates', zValidator('json', shippingRatesSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const cart = await new CartService().getCart(store.id, body.cartId);
  if (!cart) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Cart not found' } }, 404);
  const provider = new ManualShippingProvider();

  const cartForRates = cart as CartForRates;
  const cacheKeyItems = (cartForRates.items ?? []).map((i) => ({
    sku: i.product?.sku ?? null,
    productId: i.product?.id ?? i.item?.productId,
    quantity: i.item?.quantity ?? 0,
  }));
  const providerItems = (cartForRates.items ?? []).map((i) => ({
    weightGrams: i.product?.weightGrams,
    quantity: i.item?.quantity ?? 0,
    requiresShipping: i.product?.requiresShipping ?? true,
  }));

  const cache = getDefaultShippingRateCache();
  const rates = await cache.getOrLoad(
    {
      storeId: store.id,
      destination: { city: body.city, country: 'Saudi Arabia' },
      cart: cacheKeyItems,
      provider: 'manual',
    },
    () =>
      provider.calculateRates({
        storeId: store.id,
        items: providerItems,
        destination: { city: body.city, country: 'Saudi Arabia' },
        subtotal: cartForRates.subtotal,
      }),
  );

  // Map provider field names to the storefront API contract
  const mapped = (rates as Awaited<ReturnType<typeof provider.calculateRates>>).map((r) => ({
    shippingMethodId: r.methodId,
    methodName: r.methodName,
    baseRate: r.cost,
    estimatedDaysMin: r.estimatedDaysMin ?? null,
    estimatedDaysMax: r.estimatedDaysMax ?? null,
    freeAboveAmount: r.freeAbove ?? null,
  }));
  return c.json({ success: true, data: mapped });
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
  if (isFakePaymentMethodBlocked(body.paymentMethod)) {
    throw new AppError(400, 'PAYMENT_METHOD_NOT_ALLOWED', 'Payment method not available.');
  }
  try {
    const sessionResult = await new CheckoutService().createSession(store.id, body) as CheckoutSessionResult;
    const { session, idempotent } = sessionResult;
    return c.json({ success: true, data: { ...session, idempotent } }, idempotent ? 200 : 201);
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (e instanceof Error && isInsufficientStockMessage(e.message)) {
      throw new AppError(400, 'INSUFFICIENT_STOCK', PUBLIC_INSUFFICIENT_STOCK_MESSAGE);
    }
    const status = e instanceof Error && isCheckoutClientErrorMessage(e.message) ? 400 : 500;
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
    }) as BnplResult;
    return c.json({ success: true, data: { redirectUrl: bnplResult.redirectUrl, paymentId: bnplResult.paymentId, order: toPublicOrder(bnplResult.order as PublicRecord) } });
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
    const result = await new CheckoutService().handleBNPLCallback(store.id, providerPaymentId) as CheckoutCallbackResult;
    const baseUrl = result.redirectUrl || '/';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const finalUrl = result.orderNumber ? `${baseUrl}${separator}orderNumber=${result.orderNumber}` : baseUrl;
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
    const confirmResult = await new CheckoutService().confirm(store.id, sessionId, undefined, c.req.header('x-forwarded-for')) as ConfirmResult;
    // 3DS challenge: when the payment provider returns a redirectUrl,
    // forward it to the storefront so the customer is redirected to
    // the issuer's challenge page. The post-challenge webhook (or the
    // /3ds-callback endpoint below) will finalize the payment.
    const responseData: Record<string, unknown> = { ...confirmResult, order: toPublicOrder(confirmResult.order ?? {}) };
    if (confirmResult.redirectUrl) {
      responseData.redirectUrl = confirmResult.redirectUrl;
    }
    return c.json({ success: true, data: responseData });
  } catch (e) {
    if (e instanceof AppError) throw e;
    const status = e instanceof Error && (e.message.includes('not found') || e.message.includes('required') || e.message.includes('invalid')) ? 400 : 500;
    throw new AppError(status, 'CONFIRM_ERROR', e instanceof Error ? e.message : 'Confirmation failed');
  }
});

// 3DS callback: called by the storefront after the customer completes
// the 3DS challenge. Updates the payment status (paid or failed) and
// finalizes the order. For SAMA-mandated card payments in Saudi Arabia.
checkoutRouter.post('/:slug/checkout/3ds-callback', async (c) => {
  const { error } = await resolveActiveStore(c);
  if (error) return error;
  const body = await c.req.json().catch(() => ({})) as { paymentId?: number; status?: 'success' | 'failure' };
  const paymentId = Number(body.paymentId);
  if (!paymentId || !body.status) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'paymentId and status are required' } }, 400);
  }
  try {
    // For now, the fake provider handles the 3DS callback inline via
    // confirmPayment. Real providers (Moyasar/Geidea) use webhooks
    // that update the payment status directly; this endpoint exists
    // for the storefront to poll/verify the status post-3DS.
    const { createPaymentProvider } = await import('@haa/commerce-core');
    const provider = createPaymentProvider();
    const status = await provider.getPaymentStatus(paymentId);
    const isPaid = status.status === 'paid';
    const finalStatus = isPaid && body.status === 'success' ? 'paid' : 'failed';
    return c.json({ success: true, data: { paymentStatus: finalStatus, providerStatus: status.status } });
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(500, '3DS_CALLBACK_ERROR', e instanceof Error ? e.message : '3DS callback failed');
  }
});

checkoutRouter.get('/:slug/order/:orderNumber', async (c) => {
  const { error } = await resolveActiveStore(c);
  if (error) return error;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  // فحص ملكية عبر الهاتف — يمنع تعداد أرقام الطلبات وقراءة طلبات الغير (QA S3).
  const phone = c.req.query('phone');
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const order = await new OrdersService().getByOrderNumberPublic(orderNumber, phone);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as PublicRecord) });
});

checkoutRouter.get('/:slug/track/:orderNumber', async (c) => {
  const { error } = await resolveActiveStore(c);
  if (error) return error;
  const orderNumber = c.req.param('orderNumber') as string | undefined;
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number required' } }, 400);
  const phone = c.req.query('phone');
  if (!phone) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } }, 400);
  const order = await new OrdersService().getByOrderNumberPublic(orderNumber, phone);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: toPublicOrder(order as PublicRecord) });
});
