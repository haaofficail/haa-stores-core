import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type {
  ProviderCode, PaymentMode, InternalPaymentStatus,
  PaymentProviderCapabilities as PaymentProviderCapabilitiesT,
} from '@haa/shared';

// ── Capability flags helper ──────────────────────────

const FAKE_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: true,
  supportsBankTransfer: true,
  supportsStcPay: false,
  supportsBNPL: false,
};

const MOYASAR_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: true,
  supportsMada: true,
  supportsApplePay: true,
  supportsCard: true,
  supportsBankTransfer: false,
  supportsStcPay: true,
  supportsBNPL: false,
};

const GEIDEA_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: true,
  supportsMada: true,
  supportsApplePay: true,
  supportsCard: true,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: false,
};

const TABBY_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: false,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: true,
};

const TAMARA_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: false,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: true,
};

// ── Status mapping ───────────────────────────────────

export function mapProviderStatus(provider: ProviderCode, providerStatus: string): InternalPaymentStatus {
  if (provider === 'fake') {
    switch (providerStatus) {
      case 'pending': return 'pending';
      case 'paid': return 'paid';
      case 'failed': return 'failed';
      case 'refunded': return 'refunded';
      default: return 'pending';
    }
  }
  if (provider === 'moyasar') {
    switch (providerStatus) {
      case 'initiated': return 'initiated';
      case 'authorized': return 'authorized';
      case 'captured': return 'paid';
      case 'failed': return 'failed';
      case 'refunded': return 'refunded';
      case 'partially_refunded': return 'partially_refunded';
      case 'cancelled': return 'cancelled';
      default: return 'pending';
    }
  }
  if (provider === 'geidea') {
    const normalized = providerStatus.toLowerCase();
    if (['success', 'paid', 'captured'].includes(normalized)) return 'paid';
    if (['authorized'].includes(normalized)) return 'authorized';
    if (['failed', 'declined', 'error'].includes(normalized)) return 'failed';
    if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
    if (['expired'].includes(normalized)) return 'expired';
    if (['refunded'].includes(normalized)) return 'refunded';
    return 'pending';
  }
  if (provider === 'tabby') {
    const statusMap: Record<string, InternalPaymentStatus> = {
      created: 'initiated',
      authorized: 'authorized',
      captured: 'paid',
      expired: 'expired',
      rejected: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
      partially_refunded: 'partially_refunded',
    };
    return statusMap[providerStatus] ?? 'pending';
  }
  if (provider === 'tamara') {
    const statusMap: Record<string, InternalPaymentStatus> = {
      new: 'initiated',
      pending: 'pending',
      approved: 'authorized',
      captured: 'paid',
      paid: 'paid',
      cancelled: 'cancelled',
      declined: 'failed',
      expired: 'expired',
      refunded: 'refunded',
      partially_refunded: 'partially_refunded',
    };
    return statusMap[providerStatus] ?? 'pending';
  }
  return 'pending';
}

export function mapProviderError(provider: ProviderCode, errorCode: string): string {
  if (provider === 'moyasar') {
    const errors: Record<string, string> = {
      'invalid_api_key': 'Invalid API key',
      'insufficient_balance': 'Insufficient balance',
      'card_declined': 'Card declined',
      'expired_card': 'Card expired',
      'invalid_cvv': 'Invalid CVV',
      'invalid_card_number': 'Invalid card number',
      'processing_error': 'Processing error',
      'payment_not_found': 'Payment not found',
      'refund_failed': 'Refund failed',
      'invalid_amount': 'Invalid amount',
      'currency_mismatch': 'Currency mismatch',
      'duplicate_payment': 'Duplicate payment',
    };
    return errors[errorCode] ?? `Unknown error: ${errorCode}`;
  }
  if (provider === 'tabby') {
    const errors: Record<string, string> = {
      'missing_required_field': 'Missing required field',
      'invalid_amount': 'Invalid amount',
      'invalid_currency': 'Invalid currency',
      'unavailable_for_merchant': 'Tabby not available for this merchant',
      'buyer_not_eligible': 'Buyer not eligible for Tabby',
      'order_amount_out_of_range': 'Order amount out of allowed range',
      'payment_already_captured': 'Payment already captured',
      'payment_not_found': 'Payment not found',
      'refund_failed': 'Refund failed',
    };
    return errors[errorCode] ?? `Tabby error: ${errorCode}`;
  }
  if (provider === 'tamara') {
    const errors: Record<string, string> = {
      'missing_field': 'Missing required field',
      'invalid_amount': 'Invalid amount',
      'invalid_currency': 'Invalid currency',
      'customer_not_eligible': 'Customer not eligible for Tamara',
      'order_amount_exceeds_limit': 'Order amount exceeds limit',
      'order_amount_below_minimum': 'Order amount below minimum',
      'payment_not_found': 'Payment not found',
      'capture_failed': 'Capture failed',
      'refund_failed': 'Refund failed',
    };
    return errors[errorCode] ?? `Tamara error: ${errorCode}`;
  }
  return errorCode;
}

// ── PaymentProvider contract ─────────────────────────

export interface PaymentProvider {
  readonly code: ProviderCode;
  readonly name: string;
  readonly capabilities: PaymentProviderCapabilitiesT;
  readonly isAvailable: boolean;
  readonly mode: PaymentMode;

  createPaymentIntent(orderId: number, amount: number, metadata?: Record<string, unknown>, db?: DbClient): Promise<{ paymentId: number; providerPaymentId?: string; redirectUrl?: string }>;
  confirmPayment(paymentId: number, db?: DbClient): Promise<{ success: boolean; status: InternalPaymentStatus; message?: string; providerReference?: string }>;
  getPaymentStatus(paymentId: number, db?: DbClient): Promise<{ status: InternalPaymentStatus; providerStatus?: string }>;
  refundPayment(paymentId: number, amount?: number, db?: DbClient): Promise<{ success: boolean; message?: string; providerReference?: string }>;
  handleWebhook(payload: Record<string, unknown>, idempotencyKey?: string, db?: DbClient): Promise<{ success: boolean; eventType?: string; paymentId?: number }>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
}

// ── FakePaymentProvider ──────────────────────────────

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
    } else if (method === 'fake_card_failed') {
      status = 'failed';
      message = 'Card declined (simulated)';
    } else if (method === 'bank_transfer') {
      success = true;
      status = 'pending';
      message = 'Bank transfer pending confirmation';
    } else if (method === 'cash_on_delivery') {
      success = true;
      status = 'pending';
      message = 'Cash on delivery';
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

export function createGeideaSignature(values: Array<string | number | null | undefined>, apiPassword: string): string {
  const data = values.map((value) => value ?? '').join('');
  return crypto.createHmac('sha256', apiPassword).update(data).digest('base64');
}

export function verifyGeideaCallbackSignature(payload: Record<string, unknown>, apiPassword: string): boolean {
  const signature = typeof payload.signature === 'string' ? payload.signature : '';
  if (!signature) return false;
  const value = (candidate: unknown) =>
    typeof candidate === 'string' || typeof candidate === 'number' ? candidate : undefined;
  const expected = createGeideaSignature([
    value(payload.merchantPublicKey ?? payload.MerchantPublicKey),
    value(payload.orderAmount ?? payload.OrderAmount),
    value(payload.orderCurrency ?? payload.OrderCurrency),
    value(payload.orderId ?? payload.Orderid ?? payload.OrderId),
    value(payload.status ?? payload.Status),
    value(payload.merchantReferenceId ?? payload.MerchantReferenceId),
    value(payload.timeStamp ?? payload.timestamp),
  ], apiPassword);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

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

// ── TabbyProvider ────────────────────────────────────
// BNPL provider adapter for Tabby.
// Requires TABBY_SECRET_KEY and TABHY_PUBLIC_KEY env vars.

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

// ── TamaraProvider ───────────────────────────────────
// BNPL provider adapter for Tamara.
// Requires TAMARA_API_TOKEN and TAMARA_WEBHOOK_TOKEN env vars.

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

// ── MoyasarSandboxProvider ───────────────────────────
// Full adapter for Moyasar payment gateway in sandbox mode.
// Disabled by default — requires PAYMENT_SANDBOX_SECRET_KEY env var.

interface MoyasarPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  source: Record<string, unknown>;
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
        if (status === 'paid' || status === 'failed' || status === 'refunded') {
          await d.update(s.payments).set({ status, updatedAt: new Date() })
            .where(eq(s.payments.id, existingPayment.id));
        }
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
    return expected === signature;
  }
}

// ── PaymentProviderFactory ───────────────────────────

export function createPaymentProvider(providerCode?: ProviderCode, mode?: PaymentMode): PaymentProvider {
  const resolvedProvider = providerCode ?? (process.env.PAYMENT_PROVIDER as ProviderCode) ?? 'fake';
  const resolvedMode = mode ?? (process.env.PAYMENT_MODE as PaymentMode) ?? 'fake';

  if (resolvedMode === 'live') {
    throw new Error(
      'PAYMENT_MODE=live is not allowed. ' +
      'Live payments are blocked until the Payment Review Gate, KYC, Admin, ' +
      'and a formal GO decision. Set PAYMENT_MODE=fake or sandbox for now.'
    );
  }

  if (resolvedProvider === 'tabby') {
    const provider = new TabbyProvider(process.env.TABBY_COUNTRY);
    if (!provider.isAvailable) {
      console.warn(
        'Tabby provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set TABBY_SECRET_KEY and TABBY_PUBLIC_KEY env vars to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'tamara') {
    const provider = new TamaraProvider();
    if (!provider.isAvailable) {
      console.warn(
        'Tamara provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set TAMARA_API_TOKEN env var to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'moyasar') {
    const provider = new MoyasarSandboxProvider();
    if (!provider.isAvailable) {
      console.warn(
        'Moyasar provider requested but not configured — falling back to FakePaymentProvider. ' +
        'Set PAYMENT_SANDBOX_SECRET_KEY and PAYMENT_SANDBOX_PUBLIC_KEY to enable.'
      );
      return new FakePaymentProvider();
    }
    return provider;
  }

  if (resolvedProvider === 'geidea') {
    const provider = new GeideaPaymentProvider();
    if (!provider.isAvailable) {
      throw new Error(
        'GEIDEA_NOT_CONFIGURED: PAYMENT_PROVIDER=geidea requires GEIDEA_MERCHANT_PUBLIC_KEY and GEIDEA_API_PASSWORD. Fake fallback is disabled.'
      );
    }
    return provider;
  }

  return new FakePaymentProvider();
}

export function getPaymentProviderStatus(): {
  activeProvider: ProviderCode;
  activeMode: PaymentMode;
  moyasarConfigured: boolean;
  moyasarAvailable: boolean;
  geideaConfigured: boolean;
  geideaAvailable: boolean;
  tabbyConfigured: boolean;
  tabbyAvailable: boolean;
  tamaraConfigured: boolean;
  tamaraAvailable: boolean;
  liveBlocked: boolean;
} {
  const mode = (process.env.PAYMENT_MODE as PaymentMode) || 'fake';
  const provider = (process.env.PAYMENT_PROVIDER as ProviderCode) || 'fake';
  const hasMoyasarKeys = !!(process.env.PAYMENT_SANDBOX_SECRET_KEY && process.env.PAYMENT_SANDBOX_PUBLIC_KEY);
  const hasGeideaKeys = !!(process.env.GEIDEA_MERCHANT_PUBLIC_KEY && process.env.GEIDEA_API_PASSWORD);
  const hasTabbyKeys = !!(process.env.TABBY_SECRET_KEY && process.env.TABBY_PUBLIC_KEY);
  const hasTamaraToken = !!(process.env.TAMARA_API_TOKEN);

  return {
    activeProvider: provider,
    activeMode: mode,
    moyasarConfigured: hasMoyasarKeys,
    moyasarAvailable: provider === 'moyasar' && hasMoyasarKeys,
    geideaConfigured: hasGeideaKeys,
    geideaAvailable: provider === 'geidea' && hasGeideaKeys,
    tabbyConfigured: hasTabbyKeys,
    tabbyAvailable: provider === 'tabby' && hasTabbyKeys,
    tamaraConfigured: hasTamaraToken,
    tamaraAvailable: provider === 'tamara' && hasTamaraToken,
    liveBlocked: true,
  };
}

export function getAvailablePaymentMethods(providerCode?: ProviderCode): string[] {
  const code = providerCode ?? (process.env.PAYMENT_PROVIDER as ProviderCode) ?? 'fake';
  if (code === 'tabby') return ['tabby_installments'];
  if (code === 'tamara') return ['tamara_installments'];
  if (code === 'moyasar') {
    return ['moyasar_creditcard', 'moyasar_mada', 'moyasar_applepay', 'moyasar_stcpay'];
  }
  if (code === 'geidea') return ['geidea_card'];
  return ['fake_card_success', 'fake_card_failed', 'bank_transfer', 'cash_on_delivery'];
}

// ── PaymentService ───────────────────────────────────

export class PaymentService {
  constructor(private db: DbClient = createDbClient()) {}

  async getPaymentsByOrder(orderId: number) {
    return this.db.select().from(s.payments).where(eq(s.payments.orderId, orderId));
  }

  async getPayment(id: number) {
    const [payment] = await this.db.select().from(s.payments).where(eq(s.payments.id, id)).limit(1);
    if (!payment) return null;
    const attempts = await this.db.select().from(s.paymentAttempts)
      .where(eq(s.paymentAttempts.paymentId, id));
    const transactions = await this.db.select().from(s.paymentTransactions)
      .where(eq(s.paymentTransactions.paymentId, id));
    return { ...payment, attempts, transactions };
  }

  async getPaymentByProviderReference(providerPaymentId: string) {
    const [payment] = await this.db.select().from(s.payments)
      .where(eq(s.payments.providerPaymentId, providerPaymentId)).limit(1);
    return payment ?? null;
  }

  async getReconciliationReport(storeId: number, opts?: { dateFrom?: string; dateTo?: string }) {
    const conditions = [eq(s.payments.storeId, storeId)];
    if (opts?.dateFrom) conditions.push(...[]); // simplified
    const payments = await this.db.select().from(s.payments).where(and(...conditions));
    const mismatches: Array<{ paymentId: number; orderId: number; paymentAmount: number; orderTotal: number; difference: number }> = [];

    for (const payment of payments) {
      const [order] = await this.db.select().from(s.orders)
        .where(eq(s.orders.id, payment.orderId)).limit(1);
      if (order && Number(payment.amount) !== Number(order.total)) {
        mismatches.push({
          paymentId: payment.id,
          orderId: payment.orderId,
          paymentAmount: Number(payment.amount),
          orderTotal: Number(order.total),
          difference: Number(payment.amount) - Number(order.total),
        });
      }
    }

    return { totalPayments: payments.length, mismatches, mismatchCount: mismatches.length };
  }
}
