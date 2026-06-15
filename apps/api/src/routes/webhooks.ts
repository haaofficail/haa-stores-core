import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createPaymentProvider, PaymentService, OrdersService, mapProviderStatus } from '@haa/commerce-core';
import { WalletLedger } from '@haa/wallet-core';
import { WebhookOutboxService } from '@haa/integration-core';
import { NotificationService } from '@haa/notification-core';
import type { ProviderCode } from '@haa/shared';
import { deduplicateFromContext } from '../middleware/webhook-dedup.js';

const webhooksRouter = new Hono();

// ── Inbound payment webhooks ────────────────────────
// POST /webhooks/payments/:provider
// Receives and verifies incoming payment provider webhooks.

webhooksRouter.post('/payments/:provider', async (c) => {
  const providerCode = c.req.param('provider') as ProviderCode;
  const provider = createPaymentProvider(providerCode);
  const db = createDbClient();

  // Read raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header('x-moyasar-signature')
    || c.req.header('x-signature')
    || c.req.header('x-notification-token')
    || '';
  const idempotencyKey = c.req.header('x-idempotency-key') || c.req.header('idempotency-key') || undefined;

  // Verify webhook signature FIRST. Dedup happens after, so an
  // attacker can't pre-poison the idempotency table with
  // arbitrary bodies to block legitimate deliveries.
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    // Log invalid signature attempt
    try {
      const payload = JSON.parse(rawBody);
      await db.insert(s.paymentWebhookEvents).values({
        provider: providerCode,
        eventType: payload.type || 'unknown',
        rawBody,
        status: 'failed',
      });
    } catch { /* ignore parse errors */ }

    return c.json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } }, 401);
  }

  // Signature is valid — now check for duplicate delivery. Most
  // providers don't send x-idempotency-key, so the helper falls
  // back to a hash of (provider + rawBody + signature). The same
  // physical delivery always produces the same key.
  const dup = await deduplicateFromContext(c, providerCode, rawBody, signature);
  if (dup.duplicate) {
    return c.json({ success: true, data: { eventType: 'duplicate_ignored' } });
  }

  // Parse and handle the webhook
  try {
    const payload = JSON.parse(rawBody);
    const result = await provider.handleWebhook(payload as Record<string, unknown>, idempotencyKey, db);

    // If a payment was identified, update the associated order
    if (result.paymentId) {
      const paymentService = new PaymentService(db);
      const payment = await paymentService.getPayment(result.paymentId);
      if (payment && payment.orderId) {
        const cleanEventType = result.eventType?.replace(/^(payment|order)\./, '') || '';
        const internalStatus = mapProviderStatus(providerCode, cleanEventType);
        const storeId = payment.storeId;

        const [store] = await db.select({ tenantId: s.stores.tenantId }).from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
        const tenantId = store?.tenantId ?? 0;

        await db.transaction(async (tx) => {
          const txPaymentService = new PaymentService(tx as any);
          const txOrdersService = new OrdersService(tx as any);
          const txWallet = new WalletLedger(tx as any);
          const txOutbox = new WebhookOutboxService(tx as any);
          const txNotif = new NotificationService(tx as any);

          if (internalStatus === 'paid' && payment.status !== 'paid') {
            await txOrdersService.updatePaymentStatus(storeId, payment.orderId, 'paid', Number(payment.amount));
            await txOrdersService.changeStatus(storeId, payment.orderId, 'confirmed');

            await txWallet.recordEntry({
              storeId, type: 'sale', direction: 'credit',
              amount: Number(payment.amount),
              referenceType: 'order', referenceId: payment.orderId,
              description: `Order payment via ${providerCode}`,
              status: 'available',
            });
            await txWallet.recordEntry({
              storeId, type: 'platform_fee', direction: 'debit',
              amount: Math.round(Number(payment.amount) * 0.02 * 100) / 100,
              referenceType: 'order', referenceId: payment.orderId,
              description: `Platform fee (2%) for order via ${providerCode}`,
              status: 'available',
            });

            await txOutbox.recordEvent('payment.succeeded', storeId, tenantId, { paymentId: payment.id, orderId: payment.orderId, provider: providerCode });
            await txOutbox.recordEvent('order.paid', storeId, tenantId, { orderId: payment.orderId, paidAmount: Number(payment.amount) });
            await txNotif.send(storeId, 'payment_success', { orderNumber: payment.orderId.toString(), amount: payment.amount.toString() });
          } else if (internalStatus === 'failed') {
            await txOrdersService.updatePaymentStatus(storeId, payment.orderId, 'failed');
            await txOutbox.recordEvent('payment.failed', storeId, tenantId, { paymentId: payment.id, orderId: payment.orderId, provider: providerCode });
            await txNotif.send(storeId, 'payment_failed', { orderNumber: payment.orderId.toString() });
          } else if (internalStatus === 'refunded' || internalStatus === 'partially_refunded') {
            await txOrdersService.updatePaymentStatus(storeId, payment.orderId, internalStatus === 'refunded' ? 'refunded' : 'partially_refunded');
          }
        });
      }
    }

    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: { code: 'WEBHOOK_ERROR', message: e instanceof Error ? e.message : 'Webhook processing failed' } }, 400);
  }
});

export { webhooksRouter };
