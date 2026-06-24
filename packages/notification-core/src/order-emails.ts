/**
 * Transactional email-template builders for order events.
 *
 * Each function takes structured order data and returns
 * `{ subject, html }` ready to hand to a `NotificationProvider`'s
 * `send()`. They are pure: no DB access, no provider invocation,
 * no side effects.
 *
 * The actual wiring (provider selection, recipient lookup,
 * fire-and-forget dispatch) is the caller's responsibility — see
 * `OrdersService.sendOrderEmail` in `@haa/commerce-core`.
 *
 * Arabic-first. Status codes are mapped to Arabic labels via the
 * private `STATUS_LABELS` table. Any user-supplied string (customer
 * name, store name, item lines, etc.) MUST flow through `escapeHtml`
 * before being interpolated into HTML — `renderHaaEmail` does NOT
 * auto-escape its `bodyHtml` field.
 */

import { renderHaaEmail, escapeHtml } from './email-template.js';

export type OrderEmailContext = {
  /** Human-readable order number (e.g. "ORD-1-00042"). */
  orderNumber: string;
  /** Customer display name as captured at checkout. */
  customerName: string;
  /** Already-formatted total with currency (e.g. "599.00 ر.س"). */
  total: string;
  /** Optional payment method label (e.g. "بطاقة ائتمان"). */
  paymentMethod?: string;
  /** Optional shipping city — surfaced in the footer summary. */
  shippingAddressCity?: string;
  /** Pre-formatted line items, one per row (e.g. "× 2  سماعة لاسلكية — 199 ر.س"). */
  itemsLines: string[];
  /** Brand name shown in the lead paragraph + CTA copy. */
  storeName: string;
  /** Storefront base URL (e.g. "https://acme.haastores.com"). The CTA appends `/orders/<number>`. */
  storeUrl: string;
};

export type OrderStatusChangeContext = OrderEmailContext & {
  oldStatus: string;
  newStatus: string;
  /** Optional merchant-supplied reason — surfaced when status moves backward. */
  reasonNote?: string;
};

export type OrderRefundContext = OrderEmailContext & {
  /** Pre-formatted refund amount with currency. */
  refundAmount: string;
  isFullRefund: boolean;
};

/**
 * Status-code → Arabic label map. Centralised so all email
 * surfaces share one vocabulary; storefront UI and admin both
 * read from the same dictionary in the shared package, but the
 * email builders cannot import from `@haa/shared` without taking
 * on a heavier dependency, so we keep a small local copy here.
 */
const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  pending_payment: 'بانتظار الدفع',
  confirmed: 'مؤكّد',
  preparing: 'قيد التحضير',
  packed: 'جاهز للشحن',
  ready_for_pickup: 'جاهز للاستلام',
  shipped: 'تم الشحن',
  out_for_delivery: 'في طريقه إليك',
  delivered: 'تم التوصيل',
  picked_up: 'تم الاستلام',
  completed: 'مكتمل',
  cancelled: 'ملغى',
  returned: 'مرتجع',
  refunded: 'مُسترَد',
  partially_refunded: 'مُسترَد جزئياً',
};

function statusLabel(code: string): string {
  return STATUS_LABELS[code] ?? code;
}

/**
 * Build the storefront-facing order URL. The CTA always points at
 * `${storeUrl}/orders/${encodeURIComponent(orderNumber)}` so that
 * order numbers containing slashes or other reserved chars don't
 * break the link.
 */
function buildOrderUrl(storeUrl: string, orderNumber: string): string {
  const base = storeUrl.replace(/\/+$/, '');
  return `${base}/orders/${encodeURIComponent(orderNumber)}`;
}

/** Render the items list as a `<ul>` of `<li>`s with each line escaped. */
function renderItemsList(itemsLines: string[]): string {
  if (itemsLines.length === 0) return '';
  const lis = itemsLines
    .map((line) => `<li style="margin: 0 0 6px;">${escapeHtml(line)}</li>`)
    .join('');
  return `<ul style="margin: 0; padding: 0 18px 0 0; list-style: disc; color: #0f172a;">${lis}</ul>`;
}

/**
 * Render the "summary card" block: status (optional), total,
 * payment method (optional). All inputs are escaped.
 */
function renderSummaryBlock(opts: {
  statusLabel?: string;
  total: string;
  paymentMethod?: string;
}): string {
  const rows: string[] = [];
  if (opts.statusLabel) {
    rows.push(
      `<div style="margin: 0 0 6px;"><strong>الحالة:</strong> ${escapeHtml(opts.statusLabel)}</div>`,
    );
  }
  rows.push(
    `<div style="margin: 0 0 6px;"><strong>الإجمالي:</strong> ${escapeHtml(opts.total)}</div>`,
  );
  if (opts.paymentMethod) {
    rows.push(
      `<div style="margin: 0;"><strong>طريقة الدفع:</strong> ${escapeHtml(opts.paymentMethod)}</div>`,
    );
  }
  return `<div style="margin: 16px 0; padding: 16px; background: #f5f7fa; border-radius: 12px; font-size: 14px; line-height: 1.7;">
    ${rows.join('')}
  </div>`;
}

/** Render the shipping-city footer line if present. */
function renderShippingFooter(city?: string): string {
  if (!city) return '';
  return `<p style="margin: 12px 0 0; font-size: 13px; color: #475569;">
    عنوان الشحن: ${escapeHtml(city)}
  </p>`;
}

/**
 * "تم استلام طلبك" — sent to the customer when checkout
 * completes and payment is captured. First email in the order
 * lifecycle.
 */
export function renderOrderCreatedEmail(ctx: OrderEmailContext): { subject: string; html: string } {
  const subject = `تم استلام طلبك #${ctx.orderNumber} — ${ctx.storeName}`;
  const orderUrl = buildOrderUrl(ctx.storeUrl, ctx.orderNumber);
  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مرحباً ${escapeHtml(ctx.customerName)}،
    </p>
    <p style="margin: 0 0 12px;">
      شكراً لطلبك من <strong>${escapeHtml(ctx.storeName)}</strong>.
      استلمنا طلبك رقم <strong>#${escapeHtml(ctx.orderNumber)}</strong>،
      وسنعلمك بكل تحديث على حالته.
    </p>
    ${renderSummaryBlock({ total: ctx.total, paymentMethod: ctx.paymentMethod })}
    <p style="margin: 8px 0 6px;"><strong>محتويات الطلب:</strong></p>
    ${renderItemsList(ctx.itemsLines)}
    ${renderShippingFooter(ctx.shippingAddressCity)}
  `;
  const html = renderHaaEmail({
    title: `تم استلام طلبك #${ctx.orderNumber}`,
    preheader: `طلبك من ${ctx.storeName} قيد المعالجة — الإجمالي ${ctx.total}`,
    bodyHtml,
    cta: { label: 'عرض الطلب', href: orderUrl },
  });
  return { subject, html };
}

/**
 * "تحديث حالة طلبك" — sent on every customer-visible
 * status transition. Surfaces both the old and new label,
 * and an optional merchant note when status moves backward.
 */
export function renderOrderStatusChangeEmail(
  ctx: OrderStatusChangeContext,
): { subject: string; html: string } {
  const newLabel = statusLabel(ctx.newStatus);
  const oldLabel = statusLabel(ctx.oldStatus);
  const subject = `تحديث حالة طلبك #${ctx.orderNumber} — ${newLabel}`;
  const orderUrl = buildOrderUrl(ctx.storeUrl, ctx.orderNumber);
  const reasonBlock = ctx.reasonNote
    ? `<p style="margin: 12px 0 0; padding: 12px; background: #fff7ed; border-radius: 10px; font-size: 13px; color: #92400e;">
        <strong>ملاحظة المتجر:</strong> ${escapeHtml(ctx.reasonNote)}
      </p>`
    : '';
  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مرحباً ${escapeHtml(ctx.customerName)}،
    </p>
    <p style="margin: 0 0 12px;">
      حدّثنا حالة طلبك رقم <strong>#${escapeHtml(ctx.orderNumber)}</strong>
      في متجر <strong>${escapeHtml(ctx.storeName)}</strong>:
    </p>
    <div style="margin: 16px 0; padding: 16px; background: #f5f7fa; border-radius: 12px; font-size: 14px; line-height: 1.7;">
      <div style="margin: 0 0 6px;"><strong>الحالة السابقة:</strong> ${escapeHtml(oldLabel)}</div>
      <div style="margin: 0 0 6px;"><strong>الحالة الجديدة:</strong> ${escapeHtml(newLabel)}</div>
      <div style="margin: 0;"><strong>الإجمالي:</strong> ${escapeHtml(ctx.total)}</div>
    </div>
    ${reasonBlock}
    <p style="margin: 16px 0 6px;"><strong>محتويات الطلب:</strong></p>
    ${renderItemsList(ctx.itemsLines)}
    ${renderShippingFooter(ctx.shippingAddressCity)}
  `;
  const html = renderHaaEmail({
    title: `تحديث حالة طلبك #${ctx.orderNumber}`,
    preheader: `الحالة الجديدة: ${newLabel}`,
    bodyHtml,
    cta: { label: 'متابعة الطلب', href: orderUrl },
  });
  return { subject, html };
}

/**
 * "تم استرجاع المبلغ" — sent when a refund is processed.
 * Distinguishes full vs partial in both the subject and the body
 * lead so the recipient sees it before opening.
 */
export function renderOrderRefundEmail(
  ctx: OrderRefundContext,
): { subject: string; html: string } {
  const subjectLead = ctx.isFullRefund ? 'تم استرجاع المبلغ كاملاً' : 'تم استرجاع جزء من المبلغ';
  const subject = `${subjectLead} لطلب #${ctx.orderNumber} — ${ctx.storeName}`;
  const orderUrl = buildOrderUrl(ctx.storeUrl, ctx.orderNumber);
  const intro = ctx.isFullRefund
    ? 'تم استرجاع كامل قيمة طلبك.'
    : 'تم استرجاع جزء من قيمة طلبك.';
  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مرحباً ${escapeHtml(ctx.customerName)}،
    </p>
    <p style="margin: 0 0 12px;">
      ${escapeHtml(intro)} يخصّ هذا الإشعار طلبك رقم
      <strong>#${escapeHtml(ctx.orderNumber)}</strong>
      من متجر <strong>${escapeHtml(ctx.storeName)}</strong>.
    </p>
    <div style="margin: 16px 0; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; font-size: 14px; line-height: 1.7;">
      <div style="margin: 0 0 6px;"><strong>قيمة الاسترجاع:</strong> ${escapeHtml(ctx.refundAmount)}</div>
      <div style="margin: 0 0 6px;"><strong>نوع الاسترجاع:</strong> ${ctx.isFullRefund ? 'استرجاع كامل' : 'استرجاع جزئي'}</div>
      <div style="margin: 0;"><strong>إجمالي الطلب:</strong> ${escapeHtml(ctx.total)}</div>
    </div>
    <p style="margin: 16px 0 6px;"><strong>محتويات الطلب:</strong></p>
    ${renderItemsList(ctx.itemsLines)}
    <p style="margin: 16px 0 0; font-size: 13px; color: #475569;">
      قد يستغرق ظهور المبلغ في وسيلة الدفع من 3 إلى 10 أيام عمل حسب البنك.
    </p>
  `;
  const html = renderHaaEmail({
    title: `${subjectLead} #${ctx.orderNumber}`,
    preheader: `قيمة الاسترجاع: ${ctx.refundAmount}`,
    bodyHtml,
    cta: { label: 'عرض الطلب', href: orderUrl },
  });
  return { subject, html };
}

/**
 * "طلب جديد لمتجرك" — sent to the merchant (tenant owner)
 * when a new order arrives. Mirrors the customer "order created"
 * email but addresses the merchant by their own name.
 */
export function renderMerchantNewOrderEmail(
  ctx: OrderEmailContext & { merchantName: string },
): { subject: string; html: string } {
  const subject = `طلب جديد لمتجرك #${ctx.orderNumber} — ${ctx.storeName}`;
  const orderUrl = buildOrderUrl(ctx.storeUrl, ctx.orderNumber);
  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مرحباً ${escapeHtml(ctx.merchantName)}،
    </p>
    <p style="margin: 0 0 12px;">
      وصل طلب جديد إلى متجرك <strong>${escapeHtml(ctx.storeName)}</strong>
      برقم <strong>#${escapeHtml(ctx.orderNumber)}</strong> من العميل
      <strong>${escapeHtml(ctx.customerName)}</strong>.
    </p>
    ${renderSummaryBlock({ total: ctx.total, paymentMethod: ctx.paymentMethod })}
    <p style="margin: 8px 0 6px;"><strong>محتويات الطلب:</strong></p>
    ${renderItemsList(ctx.itemsLines)}
    ${renderShippingFooter(ctx.shippingAddressCity)}
  `;
  const html = renderHaaEmail({
    title: `طلب جديد #${ctx.orderNumber}`,
    preheader: `${ctx.customerName} — ${ctx.total}`,
    bodyHtml,
    cta: { label: 'فتح الطلب في لوحة التحكم', href: orderUrl },
  });
  return { subject, html };
}
