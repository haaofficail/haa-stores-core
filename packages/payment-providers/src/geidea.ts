// GeideaPaymentProvider — full adapter for Geidea payment gateway.
// Requires GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD env vars.

import { eq, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { ProviderCode, PaymentMode, InternalPaymentStatus } from '@haa/shared';
import {
  GEIDEA_CAPABILITIES,
  mapProviderStatus,
  createGeideaSignature,
  verifyGeideaCallbackSignature,
  type PaymentProvider,
} from './base.js';

export class GeideaPaymentProvider implements PaymentProvider {
  readonly code: ProviderCode = 'geidea';
  readonly name = 'Geidea';
  readonly capabilities = GEIDEA_CAPABILITIES;
  readonly mode: PaymentMode = (process.env.PAYMENT_MODE as PaymentMode) ?? 'sandbox';

  private readonly publicKey = process.env.GEIDEA_MERCHANT_PUBLIC_KEY;
  private readonly apiPassword = process.env.GEIDEA_API_PASSWORD;
  private readonly apiBaseUrl = process.env.GEIDEA_API_BASE_URL ?? 'https://api.merchant.geidea.net';
  private readonly callbackUrl = process.env.GEIDEA_CALLBACK_URL;
  private readonly returnUrl = process.env.GEIDEA_RETURN_URL;

  get isAvailable(): boolean {
    return !!(this.publicKey && this.apiPassword);
  }

  private getDb(db?: DbClient) { return db ?? createDbClient(); }

  private requireConfigured() {
    if (!this.isAvailable) {
      throw new Error('GEIDEA_NOT_CONFIGURED: Set GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD before using Geidea.');
    }
  }

  async createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient) {
    this.requireConfigured();
    const d = this.getDb(db);
    const [order] = await d.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
    if (!order) throw new Error('Order not found');
    const merchantReferenceId = `haa_${orderId}_${Date.now()}`;
    const [payment] = await d.insert(s.payments).values({
      storeId: order.storeId,
      orderId,
      provider: 'geidea',
      providerPaymentId: merchantReferenceId,
      amount: amount.toString(),
      currency: 'SAR',
      status: 'pending',
      metadata: {
        ...(metadata ?? {}),
        paymentMethod: 'geidea_card',
        merchantReferenceId,
        mode: this.mode,
      },
    }).returning();

    const signature = createGeideaSignature([
      this.publicKey,
      amount.toFixed(2),
      'SAR',
      merchantReferenceId,
      this.callbackUrl,
      this.returnUrl,
    ], this.apiPassword!);

    return {
      paymentId: payment.id,
      providerPaymentId: merchantReferenceId,
      redirectUrl: `${this.apiBaseUrl}/payment-intent/session?merchantReferenceId=${encodeURIComponent(merchantReferenceId)}&signature=${encodeURIComponent(signature)}`,
    };
  }

  async confirmPayment(paymentId: number, db?: DbClient) {
    const status = await this.getPaymentStatus(paymentId, db);
    return { success: status.status === 'paid' || status.status === 'authorized', status: status.status, providerReference: status.providerStatus };
  }

  async getPaymentStatus(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    return { status: (payment?.status as InternalPaymentStatus | undefined) ?? 'pending', providerStatus: payment?.providerPaymentId ?? undefined };
  }

  async refundPayment(_paymentId: number, _amount?: number, _db?: DbClient) {
    this.requireConfigured();
    return { success: false, message: 'Geidea refunds require live provider confirmation before enabling.' };
  }

  async handleWebhook(payload: Record<string, unknown>, idempotencyKey?: string, db?: DbClient) {
    this.requireConfigured();
    if (!verifyGeideaCallbackSignature(payload, this.apiPassword!)) {
      return { success: false, eventType: 'payment.signature_invalid' };
    }
    const d = this.getDb(db);
    const merchantReferenceId =
      typeof payload.merchantReferenceId === 'string' ? payload.merchantReferenceId :
      typeof payload.MerchantReferenceId === 'string' ? payload.MerchantReferenceId :
      undefined;
    if (!merchantReferenceId) return { success: false, eventType: 'payment.reference_missing' };
    const [payment] = await d.select().from(s.payments)
      .where(and(eq(s.payments.provider, 'geidea'), eq(s.payments.providerPaymentId, merchantReferenceId)))
      .limit(1);
    const statusValue = String(payload.status ?? payload.Status ?? 'pending');
    const status = mapProviderStatus('geidea', statusValue);
    if (payment) {
      await d.update(s.payments).set({ status, updatedAt: new Date() }).where(eq(s.payments.id, payment.id));
    }
    await d.insert(s.paymentWebhookEvents).values({
      paymentId: payment?.id,
      provider: 'geidea',
      eventType: `geidea.${statusValue.toLowerCase()}`,
      rawBody: JSON.stringify(payload),
      idempotencyKey: idempotencyKey ?? merchantReferenceId,
      status: 'received',
    }).onConflictDoNothing();
    return { success: true, eventType: `geidea.${status}`, paymentId: payment?.id };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    if (!this.apiPassword) return false;
    const expected = createGeideaSignature([payload.toString()], this.apiPassword);
    return expected === signature;
  }
}
