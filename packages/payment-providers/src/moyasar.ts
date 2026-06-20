// MoyasarSandboxProvider — full adapter for Moyasar payment gateway in sandbox mode.
// Disabled by default — requires PAYMENT_SANDBOX_SECRET_KEY env var.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import crypto from 'crypto';
import type { ProviderCode, PaymentMode, InternalPaymentStatus } from '@haa/shared';
import { MOYASAR_CAPABILITIES, mapProviderStatus, type PaymentProvider } from './base.js';

interface MoyasarPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  source: {
    type?: string;
    transaction_url?: string; // 3DS challenge URL (SAMA-mandated flow)
    [key: string]: unknown;
  };
  created_at?: string;
  fee?: number;
  refunded?: number;
}

export class MoyasarSandboxProvider implements PaymentProvider {
  readonly code: ProviderCode = 'moyasar';
  readonly name = 'Moyasar (Sandbox)';
  readonly capabilities = MOYASAR_CAPABILITIES;
  readonly isAvailable: boolean;
  readonly mode: PaymentMode = 'sandbox';

  private apiKey: string;
  private baseUrl = 'https://api.moyasar.com/v1';
  private publishableKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.PAYMENT_SANDBOX_SECRET_KEY || '';
    this.publishableKey = process.env.PAYMENT_SANDBOX_PUBLIC_KEY || '';
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';
    this.isAvailable = !!(this.apiKey && this.publishableKey);
  }

  private getDb(db?: DbClient) { return db ?? createDbClient(); }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<MoyasarPaymentResponse> {
    const encoded = Buffer.from(`${this.apiKey}:`).toString('base64');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Moyasar API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<MoyasarPaymentResponse>;
  }

  private async apiGet(path: string): Promise<MoyasarPaymentResponse> {
    const encoded = Buffer.from(`${this.apiKey}:`).toString('base64');
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Basic ${encoded}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Moyasar API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<MoyasarPaymentResponse>;
  }

  async createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient) {
    const d = this.getDb(db);
    const [order] = await d.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
    if (!order) throw new Error('Order not found');

    const paymentMethod = (metadata?.paymentMethod as string) ?? 'moyasar_creditcard';
    const sourceType = paymentMethod === 'moyasar_mada' ? 'mada'
      : paymentMethod === 'moyasar_applepay' ? 'applepay'
      : paymentMethod === 'moyasar_stcpay' ? 'stcpay'
      : 'creditcard';

    let moyasarPayment: MoyasarPaymentResponse;
    try {
      moyasarPayment = await this.apiPost('/payments', {
        amount: Math.round(amount * 100),
        currency: 'SAR',
        description: `Order ${order.orderNumber}`,
        source: { type: sourceType },
        callback_url: metadata?.callbackUrl || '',
      });
    } catch (err) {
      const [payment] = await d.insert(s.payments).values({
        storeId: order.storeId,
        orderId,
        provider: 'moyasar',
        amount: amount.toString(),
        currency: 'SAR',
        status: 'failed',
        metadata: { ...metadata, error: err instanceof Error ? err.message : 'API error' },
      }).returning();
      return { paymentId: payment.id };
    }

    const [payment] = await d.insert(s.payments).values({
      storeId: order.storeId,
      orderId,
      provider: 'moyasar',
      providerPaymentId: moyasarPayment.id,
      amount: amount.toString(),
      currency: 'SAR',
      status: mapProviderStatus('moyasar', moyasarPayment.status),
      metadata: metadata ?? null,
    }).returning();

    // 3DS challenge: if Moyasar returned a transaction_url on the source
    // (SAMA-mandated flow for online card transactions in Saudi Arabia),
    // surface it to the storefront as redirectUrl and mark the local
    // payment as `requires_3ds`. The storefront will redirect the customer
    // to the issuer's challenge page, and the post-challenge webhook
    // transitions the status to `paid` (or `failed`).
    const redirectUrl = moyasarPayment.source?.transaction_url;
    if (redirectUrl) {
      await d.update(s.payments)
        .set({ status: 'requires_3ds', updatedAt: new Date() })
        .where(eq(s.payments.id, payment.id));
      return { paymentId: payment.id, providerPaymentId: moyasarPayment.id, redirectUrl };
    }

    return { paymentId: payment.id, providerPaymentId: moyasarPayment.id };
  }

  async confirmPayment(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, status: 'failed' as InternalPaymentStatus, message: 'Payment not found' };

    if (!payment.providerPaymentId) {
      return { success: false, status: 'failed' as InternalPaymentStatus, message: 'No provider payment ID' };
    }

    try {
      const moyasarPayment = await this.apiGet(`/payments/${payment.providerPaymentId}`);
      const status = mapProviderStatus('moyasar', moyasarPayment.status);
      const success = status === 'paid' || status === 'authorized';

      await d.update(s.payments).set({ status, updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      await d.insert(s.paymentAttempts).values({
        paymentId, method: (payment.metadata as any)?.paymentMethod ?? 'creditcard',
        status,
        responseMessage: success ? 'Payment confirmed' : `Status: ${moyasarPayment.status}`,
      });

      return {
        success,
        status,
        message: success ? 'Payment successful' : `Moyasar status: ${moyasarPayment.status}`,
        providerReference: moyasarPayment.id,
      };
    } catch (err) {
      await d.update(s.payments).set({ status: 'failed', updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      return {
        success: false,
        status: 'failed' as InternalPaymentStatus,
        message: err instanceof Error ? err.message : 'Confirmation failed',
      };
    }
  }

  async getPaymentStatus(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { status: 'failed' as InternalPaymentStatus };

    if (!payment.providerPaymentId) {
      return { status: payment.status as InternalPaymentStatus };
    }

    try {
      const moyasarPayment = await this.apiGet(`/payments/${payment.providerPaymentId}`);
      return { status: mapProviderStatus('moyasar', moyasarPayment.status), providerStatus: moyasarPayment.status };
    } catch {
      return { status: payment.status as InternalPaymentStatus };
    }
  }

  async refundPayment(paymentId: number, amount?: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, message: 'Payment not found' };
    if (!payment.providerPaymentId) return { success: false, message: 'No provider payment ID' };

    const refundAmount = amount ?? Number(payment.amount);

    try {
      const result = await this.apiPost(`/payments/${payment.providerPaymentId}/refund`, {
        amount: Math.round(refundAmount * 100),
      });

      const newStatus = result.refunded && result.refunded < Number(payment.amount) * 100
        ? 'partially_refunded' as InternalPaymentStatus
        : 'refunded' as InternalPaymentStatus;

      await d.update(s.payments).set({ status: newStatus, updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      await d.insert(s.paymentTransactions).values({
        paymentId, type: 'refund', amount: refundAmount.toString(), status: 'completed',
        providerReference: result.id,
      });

      return { success: true, message: `Refunded ${refundAmount}`, providerReference: result.id };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Refund failed' };
    }
  }

  async handleWebhook(payload: Record<string, unknown>, idempotencyKey?: string, db?: DbClient) {
    const d = this.getDb(db);
    const eventType = (payload.type as string) || (payload.event as string) || 'unknown';
    const moyasarPaymentId = (payload.data as any)?.id || (payload.id as string) || '';

    if (idempotencyKey) {
      const [existing] = await d.select().from(s.paymentWebhookEvents)
        .where(eq(s.paymentWebhookEvents.idempotencyKey, idempotencyKey)).limit(1);
      if (existing) return { success: true, eventType: 'duplicate_ignored' };
    }

    const [webhookEvent] = await d.transaction(async (tx) => {
      if (idempotencyKey) {
        const [dup] = await tx.select().from(s.paymentWebhookEvents)
          .where(eq(s.paymentWebhookEvents.idempotencyKey, idempotencyKey)).limit(1);
        if (dup) return [null];
      }
      return tx.insert(s.paymentWebhookEvents).values({
        provider: 'moyasar',
        eventType,
        rawBody: JSON.stringify(payload),
        idempotencyKey: idempotencyKey ?? null,
        status: 'received',
      }).returning();
    });

    if (!webhookEvent) return { success: true, eventType: 'duplicate_ignored' };

    if (moyasarPaymentId) {
      const [existingPayment] = await d.select().from(s.payments)
        .where(eq(s.payments.providerPaymentId, moyasarPaymentId)).limit(1);
      if (existingPayment) {
        const status = mapProviderStatus('moyasar', eventType.replace('payment.', ''));
        // 3DS challenge callbacks: 'payment.requires_3ds' is informational
        // (the local payment is already in 'requires_3ds' from
        // createPaymentIntent). We acknowledge but don't change status.
        // 'payment.authorized' is the post-3DS success state. We treat it
        // like 'paid' for downstream wallet + order flows.
        if (status === 'paid' || status === 'failed' || status === 'refunded' || status === 'authorized') {
          await d.update(s.payments).set({ status, updatedAt: new Date() })
            .where(eq(s.payments.id, existingPayment.id));
        }
        // For 'requires_3ds' we keep the existing status (it's already set).
        return { success: true, eventType, paymentId: existingPayment.id };
      }
    }

    return { success: true, eventType };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(typeof payload === 'string' ? payload : payload.toString())
      .digest('hex');
    // مقارنة ثابتة الزمن — تمنع timing attack على التوقيع (QA S5)
    if (Buffer.from(expected).length !== Buffer.from(signature).length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
