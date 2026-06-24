// Public storefront-side loyalty endpoints.
//
// Today exposes ONE endpoint:
//   GET /:slug/loyalty/settings → public-safe subset of `loyalty_settings`
//
// The merchant-side loyalty router (`apps/api/src/routes/loyalty.ts`)
// stays auth-gated; THIS file is the customer-facing surface used by
// the storefront ProductCard hint + future redeem-quote / balance
// endpoints.
//
// SECURITY: only customer-facing fields are returned. Internal policy
// knobs (pointsExpiryMonths, earnOnTax, earnOnShipping) are NOT
// projected. The route reads through LoyaltyService.getRules so this
// file does NOT import drizzle-orm directly (service-layer enforcement).

import { Hono } from 'hono';
import { LoyaltyService } from '@haa/commerce-core';
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
