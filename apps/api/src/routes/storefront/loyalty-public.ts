// Public storefront-side loyalty endpoints.
//
// Three endpoints:
//   GET  /:slug/loyalty/settings     → public-safe subset of `loyalty_settings`
//   GET  /:slug/loyalty/balance      → customer balance lookup by phone
//   POST /:slug/loyalty/redeem-quote → preview discount before checkout submit
//
// The merchant-side loyalty router (`apps/api/src/routes/loyalty.ts`)
// stays auth-gated; THIS file is the customer-facing surface.
//
// SECURITY:
// - settings returns ONLY customer-facing fields. Internal policy knobs
//   (pointsExpiryMonths, earnOnTax, earnOnShipping) are NOT projected.
// - balance lookup uses phone as identifier — when the phone doesn't
//   resolve to a customer we return `{ enabled, balance: 0 }` (no leak
//   that the phone exists or doesn't).
// - quote response is server-authoritative; client only renders the
//   returned `value` (SAR). Never trust client-side math.
//
// All routes go through LoyaltyService / CustomersService so this file
// does NOT import drizzle-orm directly (service-layer enforcement).

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { LoyaltyService, CustomersService } from '@haa/commerce-core';
import { resolveActiveStore } from './_shared.js';

export const loyaltyPublicRouter = new Hono();

loyaltyPublicRouter.get('/:slug/loyalty/settings', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const rules = await new LoyaltyService().getRules(store.id);
  if (!rules.enabled) {
    return c.json({ success: true, data: { enabled: false } });
  }
  return c.json({
    success: true,
    data: {
      enabled: true,
      earnRatePerCurrency: rules.earnRatePerCurrency,
      redeemValuePerPoint: rules.redeemValuePerPoint,
      minRedeemPoints: rules.minRedeemPoints,
      maxRedeemPercent: rules.maxRedeemPercent,
      minOrderForEarn: rules.minOrderForEarn,
    },
  });
});

// GET /:slug/loyalty/balance?phone=05XXXXXXXX
//
// Customer self-lookup by phone. Returns `{ enabled: false }` when the
// store has loyalty disabled. Returns `{ enabled, balance: 0, ... }`
// when the phone doesn't resolve to a customer (no enumeration leak —
// every unknown phone looks identical to a real new customer).
loyaltyPublicRouter.get('/:slug/loyalty/balance', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const phone = c.req.query('phone');
  if (!phone) {
    return c.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Phone is required' } },
      400,
    );
  }
  const loyalty = new LoyaltyService();
  const rules = await loyalty.getRules(store.id);
  if (!rules.enabled) {
    return c.json({ success: true, data: { enabled: false } });
  }

  // Resolve phone → customer (no enumeration: unknown phone returns
  // an empty balance, NOT 404).
  const customer = await new CustomersService().findByPhone(store.id, phone);
  if (!customer) {
    return c.json({
      success: true,
      data: {
        enabled: true,
        balance: 0,
        value: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        lifetimeExpired: 0,
        rules: {
          earnRatePerCurrency: rules.earnRatePerCurrency,
          redeemValuePerPoint: rules.redeemValuePerPoint,
          minRedeemPoints: rules.minRedeemPoints,
          maxRedeemPercent: rules.maxRedeemPercent,
        },
        recent: [],
      },
    });
  }

  const [balance, value, recent] = await Promise.all([
    loyalty.getBalance(store.id, customer.id),
    loyalty.balanceValue(store.id, customer.id),
    loyalty.listTransactions(store.id, customer.id, 10),
  ]);
  const account = await loyalty.getOrCreateAccount(store.id, customer.id);
  return c.json({
    success: true,
    data: {
      enabled: true,
      balance,
      value,
      lifetimeEarned: account.lifetimeEarned ?? 0,
      lifetimeRedeemed: account.lifetimeRedeemed ?? 0,
      lifetimeExpired: account.lifetimeExpired ?? 0,
      rules: {
        earnRatePerCurrency: rules.earnRatePerCurrency,
        redeemValuePerPoint: rules.redeemValuePerPoint,
        minRedeemPoints: rules.minRedeemPoints,
        maxRedeemPercent: rules.maxRedeemPercent,
      },
      recent: recent.map((row) => ({
        id: row.id,
        type: row.type,
        direction: row.direction,
        points: row.direction === 'debit' ? -row.points : row.points,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        description: row.description ?? null,
      })),
    },
  });
});

// POST /:slug/loyalty/redeem-quote
//
// Body: { phone, points, orderTotal }
//
// Returns the SAR value that `points` would discount on an order of
// `orderTotal`. Server-authoritative — the value is the only number the
// client may render as the discount. Reason codes (`below_min`,
// `insufficient_balance`, `exceeds_max_percent`, `disabled`) let the
// widget surface a precise message.
const redeemQuoteSchema = z.object({
  phone: z.string().min(1).max(255),
  points: z.number().int().nonnegative(),
  orderTotal: z.number().nonnegative(),
});
loyaltyPublicRouter.post(
  '/:slug/loyalty/redeem-quote',
  zValidator('json', redeemQuoteSchema),
  async (c) => {
    const { store, error } = await resolveActiveStore(c);
    if (error) return error;
    const body = c.req.valid('json');
    const loyalty = new LoyaltyService();
    const rules = await loyalty.getRules(store.id);
    if (!rules.enabled) {
      return c.json({
        success: true,
        data: { points: 0, value: 0, reason: 'disabled' as const },
      });
    }
    const customer = await new CustomersService().findByPhone(store.id, body.phone);
    if (!customer) {
      // No enumeration: an unknown phone has 0 balance → reason maps to
      // insufficient_balance below the min-redeem threshold.
      return c.json({
        success: true,
        data: { points: 0, value: 0, reason: 'insufficient_balance' as const },
      });
    }
    const quote = await loyalty.previewRedemption({
      storeId: store.id,
      customerId: customer.id,
      requestedPoints: body.points,
      orderTotal: body.orderTotal,
    });
    return c.json({
      success: true,
      data: {
        points: quote.points,
        value: quote.value,
        reason: quote.reason,
      },
    });
  },
);
