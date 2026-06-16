import { Hono } from 'hono';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createShippingProvider, OtoMarketplaceService, verifyOtoWebhookSignature } from '@haa/shipping-core';
import type { ShippingProviderCode } from '@haa/shared';
import { deduplicateFromContext } from '../middleware/webhook-dedup.js';

const shippingWebhooksRouter = new Hono();
const otoWebhookRouter = new Hono();

otoWebhookRouter.post('/', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-signature') || c.req.header('x-oto-signature') || '';
  const authorizationKey = c.req.header('authorization') || c.req.header('x-authorization-key') || '';
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = String(payload.eventType ?? payload.type ?? '');
  const expectedAuthorization = process.env.OTO_WEBHOOK_AUTHORIZATION_KEY;

  if (expectedAuthorization && authorizationKey !== expectedAuthorization) {
    return c.json({ success: false, error: { code: 'INVALID_AUTHORIZATION', message: 'Invalid OTO webhook authorization.' } }, 401);
  }

  if (!verifyOtoWebhookSignature(eventType, payload, signature)) {
    return c.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid OTO webhook signature.' } }, 401);
  }

  // Signature is valid — now check for duplicate delivery. OTO
  // doesn't send x-idempotency-key, so the helper falls back to
  // sha256(provider + rawBody + signature).
  const dup = await deduplicateFromContext(c, 'oto', rawBody, signature);
  if (dup.duplicate) {
    return c.json({ success: true, data: { eventType: 'duplicate_ignored' } });
  }

  const result = await new OtoMarketplaceService().handleWebhook(eventType, payload);
  return c.json({ success: true, data: result });
});

shippingWebhooksRouter.post('/:provider', async (c) => {
  const providerCode = c.req.param('provider') as ShippingProviderCode;
  const provider = createShippingProvider(providerCode);
  const db = createDbClient();

  const rawBody = await c.req.text();
  const signature = c.req.header('x-signature') || '';
  const idempotencyKey = c.req.header('x-idempotency-key') || undefined;

  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    try {
      const payload = JSON.parse(rawBody);
      await db.insert(s.shipmentErrors).values({
        shipmentId: payload.shipmentId ?? -1,
        provider: providerCode,
        errorCode: 'INVALID_SIGNATURE',
        errorMessage: 'Invalid webhook signature',
      });
    } catch { /* ignore */ }
    return c.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } }, 401);
  }

  // Signature is valid — now check for duplicate delivery. Same
  // provider + rawBody + signature = same physical delivery.
  const dup = await deduplicateFromContext(c, providerCode, rawBody, signature);
  if (dup.duplicate) {
    return c.json({ success: true, data: { eventType: 'duplicate_ignored' } });
  }

  try {
    const payload = JSON.parse(rawBody);
    const result = await provider.handleWebhook(payload, idempotencyKey);
    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: { code: 'WEBHOOK_ERROR', message: e instanceof Error ? e.message : 'Webhook processing failed' } }, 400);
  }
});

export { otoWebhookRouter, shippingWebhooksRouter };
