// Payment provider types and shared helpers.
//
// Extracted from packages/commerce-core/src/payment.ts in
// Quality Pass 2 — Item 2.5. This file contains the shared
// capabilities constants, the PaymentProvider interface, the
// status/error mapping helpers, and the Geidea HMAC helpers.
//
// All 5 providers in this package use the same patterns:
// - getDb(db?: DbClient) — optional DB injection (DbClient is @haa/db type)
// - mapProviderStatus + mapProviderError — shared normalization
// - crypto helpers for webhook signature verification

import crypto from 'crypto';
import type { DbClient } from '@haa/db';
import type {
  ProviderCode, PaymentMode, InternalPaymentStatus,
  PaymentProviderCapabilities as PaymentProviderCapabilitiesT,
} from '@haa/shared';

// ── Capability flags helper ──────────────────────────

export const FAKE_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: true,
  supportsBankTransfer: true,
  supportsStcPay: false,
  supportsBNPL: false,
  supports3DS: true, // fake supports 3DS for testing
};

export const MOYASAR_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: true,
  supportsMada: true,
  supportsApplePay: true,
  supportsCard: true,
  supportsBankTransfer: false,
  supportsStcPay: true,
  supportsBNPL: false,
  supports3DS: true, // Moyasar supports 3DS (SAMA mandatory)
};

export const GEIDEA_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: true,
  supportsMada: true,
  supportsApplePay: true,
  supportsCard: true,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: false,
  supports3DS: true, // Geidea supports 3DS
};

export const TABBY_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: false,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: true,
  supports3DS: false, // BNPL doesn't need 3DS (Tabby handles its own auth)
};

export const TAMARA_CAPABILITIES: PaymentProviderCapabilitiesT = {
  supportsRefunds: true,
  supportsPartialRefunds: false,
  supportsMada: false,
  supportsApplePay: false,
  supportsCard: false,
  supportsBankTransfer: false,
  supportsStcPay: false,
  supportsBNPL: true,
  supports3DS: false, // BNPL doesn't need 3DS
};

// ── Status mapping ───────────────────────────────────

export function mapProviderStatus(provider: ProviderCode, providerStatus: string): InternalPaymentStatus {
  if (provider === 'fake') {
    if (providerStatus === 'paid') return 'paid';
    if (providerStatus === 'failed') return 'failed';
    if (providerStatus === 'pending') return 'pending';
    if (providerStatus === 'refunded') return 'refunded';
    if (providerStatus === 'fake_card_success' || providerStatus === 'bank_transfer' || providerStatus === 'cash_on_delivery') {
      return 'paid';
    }
    if (providerStatus === 'fake_card_failed') {
      return 'failed';
    }
    return 'pending';
  }
  if (provider === 'moyasar') {
    if (providerStatus === 'initiated') return 'initiated';
    if (providerStatus === 'authorized') return 'authorized';
    if (providerStatus === 'paid' || providerStatus === 'captured') return 'paid';
    if (providerStatus === 'failed') return 'failed';
    if (providerStatus === 'refunded') return 'refunded';
    if (providerStatus === 'cancelled') return 'cancelled';
    if (providerStatus === 'declined') return 'failed';
    if (providerStatus === 'partially_refunded') return 'partially_refunded';
    return 'pending';
  }
  if (provider === 'geidea') {
    if (providerStatus === 'success' || providerStatus === 'paid') return 'paid';
    if (providerStatus === 'failed' || providerStatus === 'declined') return 'failed';
    if (providerStatus === 'refunded') return 'refunded';
    if (providerStatus === 'authorized') return 'authorized';
    if (providerStatus === 'partially_refunded') return 'partially_refunded';
    return 'pending';
  }
  if (provider === 'tabby') {
    if (providerStatus === 'paid' || providerStatus === 'captured' || providerStatus === 'authorized') return 'paid';
    if (providerStatus === 'failed' || providerStatus === 'declined' || providerStatus === 'rejected' || providerStatus === 'expired') return 'failed';
    if (providerStatus === 'refunded') return 'refunded';
    if (providerStatus === 'authorized') return 'authorized';
    if (providerStatus === 'partially_refunded') return 'partially_refunded';
    return 'pending';
  }
  if (provider === 'tamara') {
    if (providerStatus === 'paid' || providerStatus === 'captured' || providerStatus === 'approved') return 'paid';
    if (providerStatus === 'failed' || providerStatus === 'declined' || providerStatus === 'rejected' || providerStatus === 'expired' || providerStatus === 'cancelled') return 'failed';
    if (providerStatus === 'refunded') return 'refunded';
    if (providerStatus === 'authorized' || providerStatus === 'authorised') return 'authorized';
    if (providerStatus === 'partially_refunded') return 'partially_refunded';
    return 'pending';
  }
  return 'pending';
}

export function mapProviderError(provider: ProviderCode, errorCode: string): string {
  if (provider === 'moyasar') {
    const errors: Record<string, string> = {
      'invalid_request': 'Invalid payment request',
      'invalid_api_key': 'Invalid API key',
      'authentication_failed': 'Payment authentication failed',
      'insufficient_funds': 'Insufficient funds',
      'card_declined': 'Card declined',
      'expired_card': 'Card expired',
      'invalid_cvv': 'Invalid CVV',
      'processing_error': 'Payment processing error',
      'network_error': 'Network error during payment',
    };
    return errors[errorCode] ?? `Unknown error: ${errorCode}`;
  }
  if (provider === 'geidea') {
    const errors: Record<string, string> = {
      'invalid_amount': 'Invalid amount',
      'invalid_currency': 'Invalid currency',
      'authentication_failed': 'Authentication failed',
      'card_declined': 'Card declined',
      'expired_card': 'Card expired',
      'invalid_cvv': 'Invalid CVV',
      'processing_error': 'Processing error',
      'duplicate_transaction': 'Duplicate transaction',
    };
    return errors[errorCode] ?? `Geidea error: ${errorCode}`;
  }
  if (provider === 'tabby') {
    const errors: Record<string, string> = {
      'missing_field': 'Missing required field',
      'invalid_amount': 'Invalid amount',
      'invalid_currency': 'Invalid currency',
      'customer_not_eligible': 'Customer not eligible for Tabby',
      'order_amount_exceeds_limit': 'Order amount exceeds limit',
      'order_amount_below_minimum': 'Order amount below minimum',
      'payment_not_found': 'Payment not found',
      'capture_failed': 'Capture failed',
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

// ── Geidea signature helpers ──────────────────────────

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
