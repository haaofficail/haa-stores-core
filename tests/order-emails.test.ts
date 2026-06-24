// HAA-ORDER-EMAILS — Transactional order emails.
//
// Two layers of coverage:
//
//   1. Behavioural unit tests on the four template builders in
//      `@haa/notification-core/order-emails`. We call them with
//      structured input and assert subject + HTML invariants
//      (status labels, escaping, totals, items, refund variants).
//
//   2. Source-grep guards on `OrdersService` so the wire points
//      cannot regress silently. The behavioural side of the wire-
//      up (transaction-replay idempotency, recipient resolution)
//      is exercised by the integration suite once the migration
//      lands on staging.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderOrderCreatedEmail,
  renderOrderStatusChangeEmail,
  renderOrderRefundEmail,
  renderMerchantNewOrderEmail,
  type OrderEmailContext,
  type OrderStatusChangeContext,
  type OrderRefundContext,
} from '@haa/notification-core';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(root, rel), 'utf-8');

function baseCtx(over: Partial<OrderEmailContext> = {}): OrderEmailContext {
  return {
    orderNumber: 'ORD-1-00042',
    customerName: 'سارة العتيبي',
    total: '599.00 ر.س',
    paymentMethod: 'بطاقة ائتمان',
    shippingAddressCity: 'الرياض',
    itemsLines: ['× 2  سماعة لاسلكية — 199.00 ر.س', '× 1  حافظة جلد — 201.00 ر.س'],
    storeName: 'متجر العنبر',
    storeUrl: 'https://anbar.haastores.com',
    ...over,
  };
}

describe('renderOrderCreatedEmail', () => {
  it('returns subject containing the order number + storeName', () => {
    const { subject, html } = renderOrderCreatedEmail(baseCtx());
    expect(subject).toContain('ORD-1-00042');
    expect(subject).toContain('متجر العنبر');
    expect(html.length).toBeGreaterThan(100);
  });

  it('HTML contains the customer name, total, all itemsLines', () => {
    const { html } = renderOrderCreatedEmail(baseCtx());
    expect(html).toContain('سارة العتيبي');
    expect(html).toContain('599.00 ر.س');
    expect(html).toContain('سماعة لاسلكية');
    expect(html).toContain('حافظة جلد');
  });

  it('CTA links to /orders/<encoded-order-number>', () => {
    const { html } = renderOrderCreatedEmail(baseCtx({ orderNumber: 'ORD/A 1' }));
    // encodeURIComponent('ORD/A 1') === 'ORD%2FA%201'
    expect(html).toContain('https://anbar.haastores.com/orders/ORD%2FA%201');
  });
});

describe('renderOrderStatusChangeEmail', () => {
  function statusCtx(over: Partial<OrderStatusChangeContext> = {}): OrderStatusChangeContext {
    return { ...baseCtx(), oldStatus: 'pending_payment', newStatus: 'confirmed', ...over };
  }

  it('maps Arabic status labels correctly (pending_payment → بانتظار الدفع)', () => {
    const { html, subject } = renderOrderStatusChangeEmail(
      statusCtx({ oldStatus: 'pending_payment', newStatus: 'confirmed' }),
    );
    expect(html).toContain('بانتظار الدفع');
    expect(html).toContain('مؤكّد');
    expect(subject).toContain('مؤكّد');
  });

  it('maps preparing → قيد التحضير and shipped → تم الشحن', () => {
    const a = renderOrderStatusChangeEmail(statusCtx({ oldStatus: 'confirmed', newStatus: 'preparing' }));
    expect(a.html).toContain('قيد التحضير');
    const b = renderOrderStatusChangeEmail(statusCtx({ oldStatus: 'packed', newStatus: 'shipped' }));
    expect(b.html).toContain('تم الشحن');
  });

  it('maps delivered → تم التوصيل and cancelled → ملغى', () => {
    const a = renderOrderStatusChangeEmail(statusCtx({ oldStatus: 'shipped', newStatus: 'delivered' }));
    expect(a.html).toContain('تم التوصيل');
    const b = renderOrderStatusChangeEmail(statusCtx({ oldStatus: 'confirmed', newStatus: 'cancelled' }));
    expect(b.html).toContain('ملغى');
  });

  it('surfaces the merchant reasonNote when provided', () => {
    const { html } = renderOrderStatusChangeEmail(
      statusCtx({ oldStatus: 'shipped', newStatus: 'preparing', reasonNote: 'تم إرجاع الشحنة من الناقل' }),
    );
    expect(html).toContain('تم إرجاع الشحنة من الناقل');
  });

  it('falls back to the raw code for unknown statuses', () => {
    const { html } = renderOrderStatusChangeEmail(
      statusCtx({ oldStatus: 'something_weird', newStatus: 'confirmed' }),
    );
    expect(html).toContain('something_weird');
  });
});

describe('renderOrderRefundEmail', () => {
  function refundCtx(over: Partial<OrderRefundContext> = {}): OrderRefundContext {
    return { ...baseCtx(), refundAmount: '599.00 ر.س', isFullRefund: true, ...over };
  }

  it('distinguishes full refund in subject + body', () => {
    const { subject, html } = renderOrderRefundEmail(refundCtx({ isFullRefund: true }));
    expect(subject).toContain('كاملاً');
    expect(html).toContain('استرجاع كامل');
  });

  it('distinguishes partial refund in subject + body', () => {
    const { subject, html } = renderOrderRefundEmail(
      refundCtx({ isFullRefund: false, refundAmount: '199.00 ر.س' }),
    );
    expect(subject).toContain('جزء');
    expect(html).toContain('استرجاع جزئي');
    expect(html).toContain('199.00 ر.س');
  });
});

describe('renderMerchantNewOrderEmail', () => {
  it('addresses the merchant by name + carries the customer + total', () => {
    const { subject, html } = renderMerchantNewOrderEmail({
      ...baseCtx(),
      merchantName: 'أحمد الحربي',
    });
    expect(subject).toContain('ORD-1-00042');
    expect(html).toContain('أحمد الحربي');
    expect(html).toContain('سارة العتيبي');
    expect(html).toContain('599.00 ر.س');
  });
});

describe('all builders — invariants', () => {
  it('return non-empty subject + non-empty HTML', () => {
    const ctx = baseCtx();
    const a = renderOrderCreatedEmail(ctx);
    const b = renderOrderStatusChangeEmail({ ...ctx, oldStatus: 'confirmed', newStatus: 'shipped' });
    const c = renderOrderRefundEmail({ ...ctx, refundAmount: '100.00 ر.س', isFullRefund: false });
    const d = renderMerchantNewOrderEmail({ ...ctx, merchantName: 'بائع' });
    for (const r of [a, b, c, d]) {
      expect(r.subject.length).toBeGreaterThan(0);
      expect(r.html.length).toBeGreaterThan(100);
    }
  });

  it('escapes user-supplied fields (customerName with <script>)', () => {
    const malicious = '<script>alert(1)</script>';
    const { html } = renderOrderCreatedEmail(baseCtx({ customerName: malicious }));
    // The literal tag must NOT appear unescaped.
    expect(html).not.toContain('<script>alert(1)</script>');
    // The escaped form MUST appear.
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes user-supplied itemsLines', () => {
    const { html } = renderOrderCreatedEmail(
      baseCtx({ itemsLines: ['<img src=x onerror=alert(1)> sketchy item'] }),
    );
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img');
  });

  it('escapes the storeName too', () => {
    const { html } = renderOrderCreatedEmail(baseCtx({ storeName: 'متجر "تجريبي" & شركاؤه' }));
    expect(html).toContain('&quot;تجريبي&quot;');
    expect(html).toContain('&amp;');
  });
});

describe('OrdersService source guards', () => {
  const SRC = read('packages/commerce-core/src/orders.ts');

  it('declares a private sendOrderEmail helper', () => {
    expect(SRC).toMatch(/private\s+async\s+sendOrderEmail\s*\(/);
  });

  it('changeStatus dispatches a fire-and-forget status_change email', () => {
    const changeStatusBlock = SRC.split('async changeStatus(')[1] ?? '';
    // Scope is wide — we just confirm the call exists between
    // `changeStatus` and the next top-level `async` method.
    const trimmed = changeStatusBlock.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/this\.sendOrderEmail\(/);
    expect(trimmed).toMatch(/kind:\s*['"]status_change['"]/);
    // Must be fire-and-forget — the call site must use `void` somewhere.
    expect(trimmed).toMatch(/\bvoid\b/);
  });

  it('updatePaymentStatus dispatches paid + refund emails fire-and-forget', () => {
    const block = SRC.split('async updatePaymentStatus(')[1] ?? '';
    const trimmed = block.split(/\n\s{2}(?:private\s+|async\s+)/)[0];
    expect(trimmed).toMatch(/this\.sendOrderEmail\(/);
    expect(trimmed).toMatch(/kind:\s*['"]order_created['"]/);
    expect(trimmed).toMatch(/kind:\s*['"]new_order['"]/);
    expect(trimmed).toMatch(/kind:\s*['"]order_refund['"]/);
    expect(trimmed).toMatch(/\bvoid\b/);
  });

  it('provider precedence is SmtpEmailProvider → ResendEmailProvider', () => {
    const block = SRC.split('function pickOrderEmailProvider')[1] ?? '';
    const smtpIdx = block.indexOf('SmtpEmailProvider');
    const resendIdx = block.indexOf('ResendEmailProvider');
    expect(smtpIdx).toBeGreaterThan(-1);
    expect(resendIdx).toBeGreaterThan(-1);
    expect(smtpIdx).toBeLessThan(resendIdx);
  });

  it('imports the order-email renderers from @haa/notification-core', () => {
    expect(SRC).toMatch(/renderOrderCreatedEmail/);
    expect(SRC).toMatch(/renderOrderStatusChangeEmail/);
    expect(SRC).toMatch(/renderOrderRefundEmail/);
    expect(SRC).toMatch(/renderMerchantNewOrderEmail/);
  });

  it('updatePaymentStatus skips the paid email when previous payment was already paid', () => {
    expect(SRC).toMatch(/wasAlreadyPaid/);
    expect(SRC).toMatch(/!wasAlreadyPaid/);
  });
});
