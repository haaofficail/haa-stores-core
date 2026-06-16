// TamaraProvider — BNPL provider adapter for Tamara.
// Requires TAMARA_API_TOKEN and TAMARA_WEBHOOK_TOKEN env vars.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import crypto from 'crypto';
import type { ProviderCode, PaymentMode, InternalPaymentStatus } from '@haa/shared';
import { TAMARA_CAPABILITIES, mapProviderStatus, type PaymentProvider } from './base.js';

interface TamaraCheckoutResponse {
  order_id: string;
  checkout_id: string;
  status: string;
  checkout_url: string;
}

interface TamaraOrderResponse {
  order_id: string;
  status: string;
  total_amount: { amount: string; currency: string };
  payment_type: string;
  created_at?: string;
  cancelled_at?: string;
}

export class TamaraProvider implements PaymentProvider {
  readonly code: ProviderCode = 'tamara';
  readonly name = 'Tamara BNPL';
  readonly capabilities = TAMARA_CAPABILITIES;
  readonly isAvailable: boolean;
  readonly mode: PaymentMode = 'sandbox';

  private apiToken: string;
  private webhookToken: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.TAMARA_API_TOKEN || '';
    this.webhookToken = process.env.TAMARA_WEBHOOK_TOKEN || '';
    const env = process.env.PAYMENT_MODE || 'sandbox';
    this.baseUrl = env === 'live' ? 'https://api.tamara.co' : 'https://api.sandbox.tamara.co';
    this.isAvailable = !!(this.apiToken);
  }

  private getDb(db?: DbClient) { return db ?? createDbClient(); }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Tamara API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  private async apiGet(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Tamara API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  async createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient) {
    const d = this.getDb(db);
    const [order] = await d.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
    if (!order) throw new Error('Order not found');

    const customerName = (metadata?.customerName as string) || order.customerName;
    const customerPhone = (metadata?.customerPhone as string) || order.customerPhone || '';
    const customerEmail = (metadata?.customerEmail as string) || order.customerEmail || '';
    const successUrl = (metadata?.successUrl as string) || '';
    const cancelUrl = (metadata?.cancelUrl as string) || '';
    const failureUrl = (metadata?.failureUrl as string) || '';
    const notifyUrl = (metadata?.notifyUrl as string) || '';

    let tamaraSession: Record<string, unknown>;
    try {
      tamaraSession = await this.apiPost('/checkout', {
        order: {
          reference_id: order.orderNumber,
          total_amount: { amount: amount.toFixed(2), currency: 'SAR' },
          description: `Order ${order.orderNumber}`,
          items: (metadata?.items as Array<Record<string, unknown>>) || [],
          shipping_amount: metadata?.shippingCost ? { amount: (metadata.shippingCost as number).toFixed(2), currency: 'SAR' } : undefined,
          tax_amount: metadata?.taxAmount ? { amount: (metadata.taxAmount as number).toFixed(2), currency: 'SAR' } : undefined,
        },
        consumer: {
          first_name: customerName.split(' ')[0] || customerName,
          last_name: customerName.split(' ').slice(1).join(' ') || '',
          phone_number: customerPhone,
          email: customerEmail,
        },
        locale: 'ar_SA',
        country_code: 'SA',
        payment_type: 'PAY_BY_INSTALMENTS',
        risk_assessment: {
          customer: {
            phone_number: customerPhone,
            email: customerEmail,
          },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        failure_url: failureUrl,
        notification_url: notifyUrl,
      });
    } catch (err) {
      const [payment] = await d.insert(s.payments).values({
        storeId: order.storeId,
        orderId,
        provider: 'tamara',
        amount: amount.toString(),
        currency: 'SAR',
        status: 'failed',
        metadata: { ...metadata, error: err instanceof Error ? err.message : 'API error' },
      }).returning();
      return { paymentId: payment.id };
    }

    const checkoutData = tamaraSession as unknown as TamaraCheckoutResponse;
    const redirectUrl = checkoutData.checkout_url;

    const [payment] = await d.insert(s.payments).values({
      storeId: order.storeId,
      orderId,
      provider: 'tamara',
      providerPaymentId: checkoutData.order_id,
      amount: amount.toString(),
      currency: 'SAR',
      status: mapProviderStatus('tamara', checkoutData.status),
      metadata: {
        ...metadata,
        tamaraCheckoutId: checkoutData.checkout_id,
        tamaraRedirectUrl: redirectUrl,
      },
    }).returning();

    return { paymentId: payment.id, providerPaymentId: checkoutData.order_id, redirectUrl };
  }

  async confirmPayment(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, status: 'failed' as InternalPaymentStatus, message: 'Payment not found' };

    if (!payment.providerPaymentId) {
      return { success: false, status: 'failed' as InternalPaymentStatus, message: 'No provider payment ID' };
    }

    try {
      const tamaraOrder = await this.apiGet(`/orders/${payment.providerPaymentId}`) as unknown as TamaraOrderResponse;
      const status = mapProviderStatus('tamara', tamaraOrder.status);
      const success = status === 'paid' || status === 'authorized';

      await d.update(s.payments).set({ status, updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      await d.insert(s.paymentAttempts).values({
        paymentId, method: 'tamara_installments', status,
        responseMessage: success ? 'Payment confirmed' : `Tamara status: ${tamaraOrder.status}`,
      });

      return {
        success,
        status,
        message: success ? 'Payment successful' : `Tamara status: ${tamaraOrder.status}`,
        providerReference: tamaraOrder.order_id,
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
      const tamaraOrder = await this.apiGet(`/orders/${payment.providerPaymentId}`) as unknown as TamaraOrderResponse;
      return { status: mapProviderStatus('tamara', tamaraOrder.status), providerStatus: tamaraOrder.status };
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
      const result = await this.apiPost(`/orders/${payment.providerPaymentId}/refund`, {
        total_amount: { amount: refundAmount.toFixed(2), currency: 'SAR' },
        reason: 'Merchant initiated refund',
      }) as Record<string, unknown>;

      await d.update(s.payments).set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      await d.insert(s.paymentTransactions).values({
        paymentId, type: 'refund', amount: refundAmount.toString(), status: 'completed',
        providerReference: (result.order_id as string) || payment.providerPaymentId,
      });

      return { success: true, message: `Refunded ${refundAmount}`, providerReference: payment.providerPaymentId };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Refund failed' };
    }
  }

  async handleWebhook(payload: Record<string, unknown>, idempotencyKey?: string, db?: DbClient) {
    const d = this.getDb(db);
    const eventType = (payload.event_type as string) || (payload.type as string) || 'unknown';
    const tamaraOrderId = (payload.order_id as string) || ((payload.data as Record<string, unknown>)?.order_id as string) || '';

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
        provider: 'tamara',
        eventType,
        rawBody: JSON.stringify(payload),
        idempotencyKey: idempotencyKey ?? null,
        status: 'received',
      }).returning();
    });

    if (!webhookEvent) return { success: true, eventType: 'duplicate_ignored' };

    if (tamaraOrderId) {
      const [existingPayment] = await d.select().from(s.payments)
        .where(eq(s.payments.providerPaymentId, tamaraOrderId)).limit(1);
      if (existingPayment) {
        const status = mapProviderStatus('tamara', eventType.replace('order.', ''));
        if (status === 'paid' || status === 'failed' || status === 'refunded' || status === 'authorized') {
          await d.update(s.payments).set({ status, updatedAt: new Date() })
            .where(eq(s.payments.id, existingPayment.id));
        }
        return { success: true, eventType, paymentId: existingPayment.id };
      }
    }

    return { success: true, eventType };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.webhookToken) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookToken)
      .update(typeof payload === 'string' ? payload : payload.toString())
      .digest('hex');
    return expected === signature;
  }
}
