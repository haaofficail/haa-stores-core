import { Hono } from 'hono';
import { PaymentWebhookService, type PaymentWebhookResult } from '@haa/commerce-core';
import type { ProviderCode } from '@haa/shared';

const webhooksRouter = new Hono();

/**
 * Inbound payment webhooks — POST /webhooks/payments/:provider
 *
 * Receives and verifies incoming payment provider webhooks.
 * The route is a thin transport shell. All business logic
 * (signature verify, dedup, provider call, post-payment
 * orchestration, atomicity, TASK-0030 platform-fee snapshot)
 * lives in PaymentWebhookService in @haa/commerce-core.
 *
 * As part of Quality Pass 5 Route Migration 18/24, the route
 * was reduced from ~146 lines of mixed transport + business
 * logic to this short transport shell.
 */
webhooksRouter.post('/payments/:provider', async (c) => {
  const providerCode = c.req.param('provider') as ProviderCode;

  // HTTP transport concerns: raw body + signature headers.
  // Reading the raw body is required because the provider
  // signature is computed over the exact bytes the provider
  // sent, not over a re-serialized JSON parse.
  const rawBody = await c.req.text();
  const signature = c.req.header('x-moyasar-signature')
    || c.req.header('x-signature')
    || c.req.header('x-notification-token')
    || '';
  const idempotencyKey = c.req.header('x-idempotency-key')
    || c.req.header('idempotency-key')
    || undefined;

  const result: PaymentWebhookResult = await new PaymentWebhookService().process({
    providerCode,
    rawBody,
    signature,
    idempotencyKey,
  });

  if (!result.success) {
    return c.json(
      { success: false, error: { code: result.code, message: result.message } },
      result.httpStatus,
    );
  }
  return c.json({ success: true, data: result.data });
});

export { webhooksRouter };
