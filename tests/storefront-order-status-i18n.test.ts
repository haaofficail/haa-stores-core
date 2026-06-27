// Storefront order/payment/fulfillment status localization.
//
// Regression for the customer-facing i18n gaps (QA beta runner):
//   BUG-02 — the order confirmation (OrderSuccess) and tracking
//            (TrackOrderResult) pages rendered raw English enums to the
//            shopper: payment "pending" and fulfillment "unfulfilled".
//   BUG-01 — the product page SEO title rendered the bare i18n KEY
//            "product.loading" when no product was loaded.
//
// Layer 1 — behaviour: the shared formatter never returns a raw enum and
//           localizes the exact values seen in the wild (pending/unfulfilled).
// Layer 2 — source contract: both pages route through the formatter and the
//           product title no longer uses the bare `t('product.loading')`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatOrderStatus,
  formatPaymentStatus,
  formatFulfillmentStatus,
} from '../apps/storefront/src/lib/order-status';

const ARABIC = /[؀-ۿ]/;
const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('order-status formatters (BUG-02 behaviour)', () => {
  it('payment "pending" is localized to Arabic, never raw', () => {
    const out = formatPaymentStatus('pending');
    expect(out).not.toBe('pending');
    expect(out).toMatch(ARABIC);
  });

  it('fulfillment "unfulfilled" → "بانتظار التجهيز"', () => {
    expect(formatFulfillmentStatus('unfulfilled')).toBe('بانتظار التجهيز');
  });

  it('common values render Arabic (not raw enum)', () => {
    for (const v of ['paid', 'unpaid', 'failed']) {
      expect(formatPaymentStatus(v)).toMatch(ARABIC);
      expect(formatPaymentStatus(v)).not.toBe(v);
    }
    for (const v of ['fulfilled', 'shipped', 'delivered']) {
      expect(formatFulfillmentStatus(v)).toMatch(ARABIC);
      expect(formatFulfillmentStatus(v)).not.toBe(v);
    }
    expect(formatOrderStatus('confirmed')).toBe('مؤكد');
  });

  it('unknown / null values fall back to "غير معروف" (never the raw value)', () => {
    expect(formatPaymentStatus('some_new_enum')).toBe('غير معروف');
    expect(formatFulfillmentStatus('weird_state')).toBe('غير معروف');
    expect(formatOrderStatus(null)).toBe('غير معروف');
    expect(formatPaymentStatus(undefined)).toBe('غير معروف');
    expect(formatOrderStatus('')).toBe('غير معروف');
  });
});

describe('source contract — pages route status through the formatter', () => {
  const orderSuccess = read('apps/storefront/src/pages/OrderSuccess.tsx');
  const trackResult = read('apps/storefront/src/pages/TrackOrderResult.tsx');
  const productDetail = read('apps/storefront/src/pages/ProductDetail.tsx');

  it('OrderSuccess uses the formatters for payment + fulfillment', () => {
    expect(orderSuccess).toMatch(/formatPaymentStatus\(order\.paymentStatus\)/);
    expect(orderSuccess).toMatch(/formatFulfillmentStatus\(order\.fulfillmentStatus\)/);
    // and no longer renders the raw enum directly in a badge
    expect(orderSuccess).not.toMatch(/<StoreBadge>\{order\.fulfillmentStatus\}<\/StoreBadge>/);
  });

  it('TrackOrderResult no longer leaks the raw fulfillment/payment enum', () => {
    expect(trackResult).toMatch(/formatFulfillmentStatus\(order\.fulfillmentStatus\)/);
    expect(trackResult).not.toMatch(/<StoreBadge>\{order\.fulfillmentStatus\}<\/StoreBadge>/);
    expect(trackResult).toMatch(/formatPaymentStatus\(order\.paymentStatus\)/);
  });

  it('ProductDetail title no longer renders the bare product.loading key (BUG-01)', () => {
    // The old line was exactly `: t('product.loading'),` with no default value.
    expect(productDetail).not.toMatch(/:\s*t\('product\.loading'\),/);
    // Not-found state must surface a real Arabic title.
    expect(productDetail).toMatch(/t\('product\.notFound'/);
  });
});
