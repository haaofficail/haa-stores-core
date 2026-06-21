// FakePaymentProvider — used in dev/test/stub mode.
// Always available, no env config required.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import type { DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { ProviderCode, PaymentMode, InternalPaymentStatus } from '@haa/shared';
import { FAKE_CAPABILITIES, type PaymentProvider } from './base.js';

export class FakePaymentProvider implements PaymentProvider {
  readonly code: ProviderCode = 'fake';
  readonly name = 'Fake Payment';
  readonly capabilities = FAKE_CAPABILITIES;
  readonly isAvailable = true;
  readonly mode: PaymentMode = 'fake';

  private getDb(db?: DbClient) { return db ?? createDbClient(); }

  async createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient) {
    const d = this.getDb(db);
    const [order] = await d.select().from(s.orders).where(eq(s.orders.id, orderId)).limit(1);
    const paymentMethod = (metadata?.paymentMethod as string) ?? 'fake_card_success';

    // 3DS challenge simulation: when the test/dev environment uses
    // 'fake_3ds_challenge' as the payment method, surface a fake
    // 3DS challenge URL and mark the local payment as 'requires_3ds'
    // so the storefront redirects the customer to a fake challenge page
    // (where the dev can click "succeed" or "fail" to test the flow).
    if (paymentMethod === 'fake_3ds_challenge') {
      const [payment] = await d.insert(s.payments).values({
        storeId: order!.storeId,
        orderId,
        provider: 'fake',
        amount: amount.toString(),
        currency: 'SAR',
        status: 'requires_3ds',
        metadata: { ...metadata, _3dsSimulated: true },
      }).returning();
      // The redirectUrl points to the storefront's fake 3DS page; the
      // storefront appends the paymentId so the page can call back.
      const fakeRedirectUrl = `/fake-3ds-challenge?paymentId=${payment.id}`;
      return {
        paymentId: payment.id,
        providerPaymentId: `fake_${payment.id}`,
        redirectUrl: fakeRedirectUrl,
      };
    }

    const [payment] = await d.insert(s.payments).values({
      storeId: order!.storeId,
      orderId,
      provider: 'fake',
      amount: amount.toString(),
      currency: 'SAR',
      status: 'pending',
      metadata: metadata ?? null,
    }).returning();
    return { paymentId: payment.id, providerPaymentId: `fake_${payment.id}` };
  }

  async confirmPayment(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, status: 'failed' as InternalPaymentStatus, message: 'Payment not found' };

    const method = (payment.metadata as { paymentMethod?: string })?.paymentMethod ?? 'fake_card_success';
    let success = false;
    let status: InternalPaymentStatus = 'failed';
    let message = 'Payment failed';

    if (method === 'fake_card_success') {
      success = true;
      status = 'paid';
      message = 'Payment successful';
    } else if (method === 'fake_card_failed' || method === 'fake_card_declined') {
      status = 'failed';
      message = 'Card declined (simulated)';
    } else if (method === 'fake_card_cancelled') {
      // DECISION-OS-012 scenario: user cancelled at provider hosted page.
      status = 'failed';
      message = 'Payment cancelled by user (simulated)';
    } else if (method === 'fake_card_expired') {
      // DECISION-OS-012 scenario: payment intent expired before confirmation.
      status = 'failed';
      message = 'Payment intent expired (simulated)';
    } else if (method === 'bank_transfer') {
      success = true;
      status = 'pending';
      message = 'Bank transfer pending confirmation';
    } else if (method === 'cash_on_delivery') {
      success = true;
      status = 'pending';
      message = 'Cash on delivery';
    } else if (method === 'fake_3ds_challenge') {
      // Should not be called directly — the 3DS callback handler in
      // the API route updates the status. Defensive: treat as success
      // so the dev-mode flow doesn't break.
      success = true;
      status = 'paid';
      message = '3DS challenge completed (simulated)';
    }

    await d.update(s.payments).set({ status, updatedAt: new Date() })
      .where(eq(s.payments.id, paymentId));

    await d.insert(s.paymentAttempts).values({
      paymentId, method, status,
      responseMessage: message,
    });

    return { success, status, message, providerReference: `fake_${paymentId}` };
  }

  async getPaymentStatus(paymentId: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { status: 'failed' as InternalPaymentStatus };
    return { status: payment.status as InternalPaymentStatus, providerStatus: payment.status };
  }

  async refundPayment(paymentId: number, amount?: number, db?: DbClient) {
    const d = this.getDb(db);
    const [payment] = await d.select().from(s.payments).where(eq(s.payments.id, paymentId)).limit(1);
    if (!payment) return { success: false, message: 'Payment not found' };

    const refundAmount = amount ?? Number(payment.amount);
    await d.update(s.payments).set({ status: 'refunded', updatedAt: new Date() })
      .where(eq(s.payments.id, paymentId));

    await d.insert(s.paymentTransactions).values({
      paymentId, type: 'refund', amount: refundAmount.toString(), status: 'completed',
      providerReference: payment.providerPaymentId,
    });

    return { success: true, message: `Refunded ${refundAmount}`, providerReference: `refund_fake_${paymentId}` };
  }

  async handleWebhook(_payload: Record<string, unknown>, _idempotencyKey?: string, _db?: DbClient) {
    return { success: true, eventType: 'payment.received' };
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean {
    const mode = process.env.PAYMENT_MODE || 'fake';
    if (mode !== 'fake') return false;
    return true;
  }
}
