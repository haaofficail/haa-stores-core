import { eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  PaymentService,
  createPaymentProvider,
  mapProviderStatus,
} from '@haa/payment-providers';
import { WalletLedger, describePlatformFeePolicy } from '@haa/wallet-core';
import { WebhookOutboxService, deduplicateWebhook } from '@haa/integration-core';
import { NotificationService } from '@haa/notification-core';
import type { ProviderCode } from '@haa/shared';
import { OrdersService } from './orders.js';
import { StoreBillingSettingsService } from './billing-settings-service.js';
import { WalletPostingService } from './wallet-posting-service.js';
import { LoyaltyService } from './loyalty.js';

/**
 * Result envelope returned by PaymentWebhookService.process.
 * Routes consume this to map to HTTP status codes (200, 400,
 * 401) without re-running any of the business logic.
 *
 * The shape matches what the route used to return before the
 * migration, so the public API is byte-identical for clients.
 */
export type PaymentWebhookResult =
  | { success: true; data: { eventType?: string; [k: string]: unknown } }
  | { success: false; code: 'INVALID_SIGNATURE' | 'WEBHOOK_ERROR'; message: string; httpStatus: 401 | 400 };

/**
 * Input shape for PaymentWebhookService.process. The route
 * builds this from the Hono context (raw body + signature
 * headers) and passes it in. The service is HTTP-agnostic.
 */
export interface PaymentWebhookInput {
  providerCode: ProviderCode;
  rawBody: string;
  signature: string;
  /** Provider-supplied idempotency key, or undefined for the fallback hash. */
  idempotencyKey?: string;
}

/**
 * PaymentWebhookService — owns the business logic for
 * processing inbound payment provider webhooks.
 *
 * Originally extracted from `apps/api/src/routes/webhooks.ts`
 * as part of Quality Pass 5, Route Migration 18/24.
 *
 * The route used to do, inline, ~80 lines of mixed transport
 * + business logic:
 *   1. Signature verify
 *   2. Dedup check (edge idempotency)
 *   3. JSON parse + provider.handleWebhook
 *   4. Post-payment orchestration in a single DB transaction:
 *      - order payment status update
 *      - order status change to 'confirmed'
 *      - wallet credit (sale entry)
 *      - platform fee entry with TASK-0030 snapshot fields
 *      - outbox events (payment.succeeded, order.paid)
 *      - notification (payment_success)
 *   5. Failed branch: payment status + outbox + notification
 *   6. Refund branch: payment status update only
 *
 * All 6 concerns now live here. The route is a thin transport
 * shell that:
 *   - reads c.req.text() (raw body)
 *   - reads signature headers
 *   - calls process(...)
 *   - maps PaymentWebhookResult to the response envelope
 *
 * Pre-existing services (PaymentService, OrdersService,
 * WalletLedger, StoreBillingSettingsService,
 * WebhookOutboxService, NotificationService,
 * createPaymentProvider, mapProviderStatus) are reused. We
 * do NOT re-implement carrier/provider logic, do NOT touch
 * the payment/order/wallet schema, and do NOT change the
 * atomicity guarantee (everything inside one transaction).
 *
 * Why @haa/commerce-core and not @haa/integration-core?
 * The service composes OrdersService (commerce-core) with
 * payment, wallet, outbox, and notification services.
 * commerce-core already depends on all of them; the reverse
 * direction would be a circular dependency. This matches the
 * convention used by ShipmentsService, DashboardService,
 * StoreSettingsService, ProviderStatusService.
 */
export class PaymentWebhookService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Process an inbound payment webhook. Returns a structured
   * result envelope. The caller (route) maps to HTTP.
   *
   * Flow:
   *   1. Verify signature (provider boundary)
   *   2. Check dedup
   *   3. Parse + provider.handleWebhook
   *   4. If a payment was identified, run the post-payment
   *      orchestration in a single transaction
   */
  async process(input: PaymentWebhookInput): Promise<PaymentWebhookResult> {
    const { providerCode, rawBody, signature, idempotencyKey } = input;

    // 1. Resolve provider + verify signature
    const provider = createPaymentProvider(providerCode);

    if (!provider.verifyWebhookSignature(rawBody, signature)) {
      // Log invalid signature attempt — same behavior the
      // route used to do inline.
      try {
        const payload = JSON.parse(rawBody);
        await this.db.insert(s.paymentWebhookEvents).values({
          provider: providerCode,
          eventType: payload.type || 'unknown',
          rawBody,
          status: 'failed',
        });
      } catch { /* ignore parse errors — invalid JSON is not our problem here */ }
      return {
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature',
        httpStatus: 401,
      };
    }

    // 2. Dedup — same physical delivery always produces
    //    the same key, so replays are no-ops.
    const dup = await deduplicateWebhook(
      providerCode,
      rawBody,
      signature,
      idempotencyKey,
    );
    if (dup.duplicate) {
      return {
        success: true,
        data: { eventType: 'duplicate_ignored' },
      };
    }

    // 3. Parse + delegate to provider
    try {
      const payload = JSON.parse(rawBody);
      const result = await provider.handleWebhook(
        payload as Record<string, unknown>,
        idempotencyKey,
        this.db,
      );

      // 4. Post-payment orchestration (if a payment was identified)
      if (result.paymentId) {
        await this.runPostPaymentFlow({
          providerCode,
          paymentId: result.paymentId,
          eventType: result.eventType,
        });
      }

      return { success: true, data: result as { eventType?: string; [k: string]: unknown } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Webhook processing failed';
      return {
        success: false,
        code: 'WEBHOOK_ERROR',
        message: msg,
        httpStatus: 400,
      };
    }
  }

  /**
   * Run the post-payment orchestration in a single
   * transaction. This is the most important atomicity
   * guarantee of the entire webhook path — if any step
   * fails, the whole thing rolls back.
   *
   * Branches:
   *   - paid: order + wallet + platform fee + outbox + notification
   *   - failed: order + outbox + notification
   *   - refunded / partially_refunded: order status update only
   */
  private async runPostPaymentFlow(args: {
    providerCode: ProviderCode;
    paymentId: number;
    eventType?: string;
  }): Promise<void> {
    const { providerCode, paymentId, eventType } = args;
    const paymentService = new PaymentService(this.db);
    const payment = await paymentService.getPayment(paymentId);
    if (!payment || !payment.orderId) return;

    const cleanEventType = eventType?.replace(/^(payment|order)\./, '') || '';
    const internalStatus = mapProviderStatus(providerCode, cleanEventType);
    const storeId = payment.storeId;

    // Look up tenant for the outbox event payload.
    //
    // P2-001 audit fix: previously fell back to `?? 0` if the store
    // lookup returned nothing. That landed `tenantId = 0` in the
    // outbox payload — a fake tenant id that downstream consumers
    // would route as if it were a real one. A missing store at this
    // point is genuinely a bug (storeId came from a confirmed
    // payment row, so the store MUST exist) — fail loudly instead of
    // poisoning the outbox.
    const [store] = await this.db
      .select({ tenantId: s.stores.tenantId })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) {
      throw new Error(
        `payment-webhook-service: store ${storeId} not found for payment ${payment.id} — refusing to emit outbox event with placeholder tenantId`,
      );
    }
    const tenantId = store.tenantId;

    let becamePaid = false;
    await this.db.transaction(async (tx) => {
      // P3-001 resolved: services now accept `DbOrTx`, so the tx
      // value flows in without an `as any` cast.
      const _txPaymentService = new PaymentService(tx);
      const txOrdersService = new OrdersService(tx);
      const txWallet = new WalletLedger(tx);
      const txOutbox = new WebhookOutboxService(tx);
      const txNotif = new NotificationService(tx);
      const txBilling = new StoreBillingSettingsService(tx);
      const txPosting = new WalletPostingService(tx);

      if (internalStatus === 'paid' && payment.status !== 'paid') {
        becamePaid = true;
        await txOrdersService.updatePaymentStatus(storeId, payment.orderId, 'paid', Number(payment.amount));
        await txOrdersService.changeStatus(storeId, payment.orderId, 'confirmed');

        // Centralize wallet entry creation via WalletPostingService
        // (TASK-0033 + TASK-0034 sub-item 5). The service provides
        // the entry type + amount; the actual DB write is delegated
        // to WalletLedger. The 'orderNumber' field is metadata only
        // (not part of the dedup key), so the String(orderId)
        // placeholder is safe — a future task can look up the real
        // orderNumber if audit metadata needs it.
        const saleResult = await txPosting.postSale({
          storeId,
          orderId: payment.orderId,
          orderTotal: Number(payment.amount),
          orderNumber: String(payment.orderId),
          method: 'online',
        });
        await txWallet.recordEntry({
          storeId, type: saleResult.entryType, direction: 'credit',
          amount: saleResult.amount,
          referenceType: 'order', referenceId: payment.orderId,
          description: `Order payment via ${providerCode}`,
          status: 'available',
        });

        // TASK-0030: snapshot the platform-fee policy onto the
        // fee entry. The service now owns the calculation; the
        // ledger write still attaches the audit-trail fields
        // (feeRatePct / feeFixed / feeSource / metadata) so the
        // existing wallet summary UI and admin reporting continue
        // to work. Cross-flow idempotency (checkout wrote the
        // platform_fee before the webhook arrived) is preserved
        // via hasPlatformFeeForOrder — the service's per-instance
        // dedup only protects within a single transaction.
        const platformPolicy = await txBilling.getPlatformFeePolicy(storeId);
        const platformResult = await txPosting.postPlatformFee({
          storeId,
          orderId: payment.orderId,
          orderTotal: Number(payment.amount),
          orderNumber: String(payment.orderId),
          policy: platformPolicy,
        });
        if (platformResult.amount > 0) {
          const alreadyCharged = await txWallet.hasPlatformFeeForOrder(storeId, payment.orderId);
          if (!alreadyCharged) {
            await txWallet.recordEntry({
              storeId, type: platformResult.entryType, direction: 'debit',
              amount: platformResult.amount,
              referenceType: 'order', referenceId: payment.orderId,
              description: `رسوم منصة Haa (${describePlatformFeePolicy(platformPolicy)}) للطلب عبر ${providerCode}`,
              status: 'available',
              feeRatePct: platformPolicy.pct ?? null,
              feeFixed: platformPolicy.fixed ?? null,
              feeSource: 'platform_policy',
              metadata: {
                orderTotal: Number(payment.amount),
                platformFeeMode: platformPolicy.mode,
                platformFeePct: platformPolicy.pct ?? null,
                platformFeeFixed: platformPolicy.fixed ?? null,
                platformFeeLabel: describePlatformFeePolicy(platformPolicy),
                appliedAt: new Date().toISOString(),
              },
            });
          }
        }

        await txOutbox.recordEvent('payment.succeeded', storeId, tenantId, {
          paymentId: payment.id, orderId: payment.orderId, provider: providerCode,
        });
        await txOutbox.recordEvent('order.paid', storeId, tenantId, {
          orderId: payment.orderId, paidAmount: Number(payment.amount),
        });
        await txNotif.send(storeId, 'payment_success', {
          orderNumber: payment.orderId.toString(),
          amount: payment.amount.toString(),
        });
      } else if (internalStatus === 'failed') {
        await txOrdersService.updatePaymentStatus(storeId, payment.orderId, 'failed');
        await txOutbox.recordEvent('payment.failed', storeId, tenantId, {
          paymentId: payment.id, orderId: payment.orderId, provider: providerCode,
        });
        await txNotif.send(storeId, 'payment_failed', {
          orderNumber: payment.orderId.toString(),
        });
      } else if (internalStatus === 'refunded' || internalStatus === 'partially_refunded') {
        await txOrdersService.updatePaymentStatus(
          storeId,
          payment.orderId,
          internalStatus === 'refunded' ? 'refunded' : 'partially_refunded',
        );
      }
    });

    // اكسب نقاط الولاء بعد نجاح الدفع — خارج معاملة الدفع عمداً:
    // idempotent عبر (store, order)، و best-effort فلا يُفشل معالجة الدفع أبداً.
    if (becamePaid) {
      await this.awardLoyaltyForOrder(storeId, payment.orderId).catch((err) => {
        console.error(`[loyalty] earn failed for order ${payment.orderId}:`, err);
      });
    }
  }

  /** اكسب نقاط الولاء لطلب مدفوع (idempotent). يُتجاهل بهدوء لو لا عميل/طلب. */
  private async awardLoyaltyForOrder(storeId: number, orderId: number): Promise<void> {
    const [order] = await this.db.select({
      customerId: s.orders.customerId,
      orderNumber: s.orders.orderNumber,
      subtotal: s.orders.subtotal,
      taxAmount: s.orders.taxAmount,
      shippingCost: s.orders.shippingCost,
    }).from(s.orders).where(eq(s.orders.id, orderId)).limit(1);

    if (!order || !order.customerId) return;

    await new LoyaltyService(this.db).earnFromOrder({
      storeId,
      customerId: order.customerId,
      orderId,
      orderNumber: order.orderNumber,
      amounts: {
        subtotal: Number(order.subtotal),
        tax: Number(order.taxAmount ?? 0),
        shipping: Number(order.shippingCost ?? 0),
      },
    });
  }
}
