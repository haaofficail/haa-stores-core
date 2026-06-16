// TabbyProvider — BNPL provider adapter for Tabby.
// Requires TABBY_SECRET_KEY and TABBY_PUBLIC_KEY env vars.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import crypto from 'crypto';
import type { ProviderCode, PaymentMode, InternalPaymentStatus } from '@haa/shared';
import { TABBY_CAPABILITIES, mapProviderStatus, type PaymentProvider } from './base.js';

interface TabbySessionResponse {
  id: string;
  status: string;
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    created_at?: string;
  };
  configuration: {
    available_products: { installments: { amount: number }[] }[];
  };
  merchant_code?: string;
  lang?: string;
}

interface TabbyPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at?: string;
  refunded_amount?: number;
}

export class TabbyProvider implements PaymentProvider {
  readonly code: ProviderCode = 'tabby';
  readonly name = 'Tabby BNPL';
  readonly capabilities = TABBY_CAPABILITIES;
  readonly isAvailable: boolean;
  readonly mode: PaymentMode = 'sandbox';

  private secretKey: string;
  private publicKey: string;
  private baseUrl: string;

  constructor(country?: string) {
    this.secretKey = process.env.TABBY_SECRET_KEY || '';
    this.publicKey = process.env.TABBY_PUBLIC_KEY || '';
    // Tabby base URL depends on country, not on test/live mode.
    // Saudi Arabia uses api.tabby.sa; UAE/Kuwait use api.tabby.ai.
    // Test vs live is determined by the API keys themselves.
    const resolvedCountry = country || process.env.TABBY_COUNTRY || 'SA';
    this.baseUrl = resolvedCountry === 'SA' ? 'https://api.tabby.sa' : 'https://api.tabby.ai';
    this.isAvailable = !!(this.secretKey && this.publicKey);
  }

  private getDb(db?: DbClient) { return db ?? createDbClient(); }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'X-Public-Key': this.publicKey,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Tabby API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  private async apiGet(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'X-Public-Key': this.publicKey,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Tabby API error: ${(err.message as string) || res.statusText}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
  }

  async createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient) {
    const d = this.getDb(db);
    const [order] = await d.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
    if (!order) throw new Error('Order not found');

    const customerName = (metadata?.customerName as string) || order.customerName;
    const customerPhone = (metadata?.customerPhone as string) || order.customerPhone;
    const customerEmail = (metadata?.customerEmail as string) || order.customerEmail || '';
    const successUrl = (metadata?.successUrl as string) || '';
    const cancelUrl = (metadata?.cancelUrl as string) || '';
    const failureUrl = (metadata?.failureUrl as string) || '';

    let tabbySession: Record<string, unknown>;
    try {
      tabbySession = await this.apiPost('/api/v2/checkout', {
        payment: {
          amount: Math.round(amount * 100),
          currency: 'SAR',
          description: `Order ${order.orderNumber}`,
          buyer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
          },
          order: {
            reference_id: order.orderNumber,
            items: (metadata?.items as Array<Record<string, unknown>>) || [],
            shipping_amount: metadata?.shippingCost || 0,
            tax_amount: metadata?.taxAmount || 0,
          },
        },
        lang: 'ar',
        merchant_code: metadata?.merchantCode as string || '',
        success_url: successUrl,
        cancel_url: cancelUrl,
        failure_url: failureUrl,
      });
    } catch (err) {
      const [payment] = await d.insert(s.payments).values({
        storeId: order.storeId,
        orderId,
        provider: 'tabby',
        amount: amount.toString(),
        currency: 'SAR',
        status: 'failed',
        metadata: { ...metadata, error: err instanceof Error ? err.message : 'API error' },
      }).returning();
      return { paymentId: payment.id };
    }

    const sessionData = tabbySession as unknown as TabbySessionResponse;
    const providerPaymentId = sessionData.payment?.id || sessionData.id;

    // Tabby redirect URL: checkout subdomain + /payments/{sessionId}
    const tabbyCheckoutBase = this.baseUrl.replace('api.', 'checkout.');
    const redirectUrl = `${tabbyCheckoutBase}/payments/${sessionData.id}`;

    const [payment] = await d.insert(s.payments).values({
      storeId: order.storeId,
      orderId,
      provider: 'tabby',
      providerPaymentId,
      amount: amount.toString(),
      currency: 'SAR',
      status: mapProviderStatus('tabby', sessionData.status || sessionData.payment?.status || 'pending'),
      metadata: { ...metadata, tabbySessionId: sessionData.id, redirectUrl },
    }).returning();

    return { paymentId: payment.id, providerPaymentId, redirectUrl };
  }

  async confirmPayment(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, status: 'failed' as InternalPaymentStatus, message: 'Payment not found' };

    if (!payment.providerPaymentId) {
      return { success: false, status: 'failed' as InternalPaymentStatus, message: 'No provider payment ID' };
    }

    try {
      const tabbyPayment = await this.apiGet(`/api/v2/payments/${payment.providerPaymentId}`) as unknown as TabbyPaymentResponse;
      const status = mapProviderStatus('tabby', tabbyPayment.status);
      const success = status === 'paid' || status === 'authorized';

      await d.update(s.payments).set({ status, updatedAt: new Date() })
        .where(eq(s.payments.id, paymentId));

      await d.insert(s.paymentAttempts).values({
        paymentId, method: 'tabby_installments', status,
        responseMessage: success ? 'Payment confirmed' : `Tabby status: ${tabbyPayment.status}`,
      });

      return {
        success,
        status,
        message: success ? 'Payment successful' : `Tabby status: ${tabbyPayment.status}`,
        providerReference: tabbyPayment.id,
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
      const tabbyPayment = await this.apiGet(`/api/v2/payments/${payment.providerPaymentId}`) as unknown as TabbyPaymentResponse;
      return { status: mapProviderStatus('tabby', tabbyPayment.status), providerStatus: tabbyPayment.status };
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
      const result = await this.apiPost(`/api/v2/payments/${payment.providerPaymentId}/captures`, {
        amount: Math.round(refundAmount * 100),
      }) as unknown as TabbyPaymentResponse;

      await d.update(s.payments).set({ status: 'refunded', updatedAt: new Date() })
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
    const tabbyPaymentId = ((payload.data as Record<string, unknown>)?.payment as Record<string, unknown>)?.id as string
      || (payload.id as string) || '';

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
        provider: 'tabby',
        eventType,
        rawBody: JSON.stringify(payload),
        idempotencyKey: idempotencyKey ?? null,
        status: 'received',
      }).returning();
    });

    if (!webhookEvent) return { success: true, eventType: 'duplicate_ignored' };

    if (tabbyPaymentId) {
      const [existingPayment] = await d.select().from(s.payments)
        .where(eq(s.payments.providerPaymentId, tabbyPaymentId)).limit(1);
      if (existingPayment) {
        const status = mapProviderStatus('tabby', eventType.replace('payment.', ''));
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
    if (!this.secretKey) return false;
    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(typeof payload === 'string' ? payload : payload.toString())
      .digest('hex');
    return expected === signature;
  }
}
