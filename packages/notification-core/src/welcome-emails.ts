/**
 * Transactional welcome email for newly verified merchants.
 *
 * Sent ONCE, immediately after the merchant completes their signup OTP
 * verification (`AuthFlowService.verifySignup`). This is the FIRST
 * email the merchant receives after the OTP code itself, so it sets
 * the tone for the onboarding experience: congratulate, restate the
 * storefront URL, and surface the 3-step starter checklist.
 *
 * Pure function: no DB access, no provider invocation, no side
 * effects. The caller (`AuthFlowService.verifySignup`) handles
 * provider selection + fire-and-forget dispatch — failure here must
 * never fail the verify response. The DB row (`email_verified_at`) is
 * the source of truth.
 *
 * Arabic-first, RTL. Every user-supplied string flows through
 * `escapeHtml` before being interpolated into the body — the shared
 * `renderHaaEmail` template does NOT auto-escape its `bodyHtml` field.
 */

import { renderHaaEmail, escapeHtml } from './email-template.js';

export type MerchantWelcomeContext = {
  /** Merchant's display name (greeted by name in the lead paragraph). */
  merchantName: string;
  /** Store display name, surfaced in the subject + body lead. */
  storeName: string;
  /** Store slug — kept for callers that may want to log/audit it. */
  storeSlug: string;
  /** Public storefront URL (e.g. `https://acme.haastores.com`). */
  storeUrl: string;
  /** Merchant dashboard base URL (e.g. `https://merchant.haastores.com`). */
  dashboardUrl: string;
};

/** Trim trailing slashes so URL concatenation never produces `//path`. */
function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * "أهلاً بك في هاء متاجر — متجرك جاهز للانطلاق"
 *
 * Sent ONCE when a merchant completes signup OTP verification. This
 * is the first email the merchant receives after the OTP code itself.
 * It congratulates them, restates the storefront URL, and links to
 * the 3-step starter checklist (add products → connect payment →
 * publish).
 */
export function renderMerchantWelcomeEmail(
  ctx: MerchantWelcomeContext,
): { subject: string; html: string } {
  const subject = `أهلاً بك في هاء متاجر — متجرك ${ctx.storeName} جاهز`;
  const preheader = 'خطوات بسيطة لإطلاق متجرك خلال دقائق.';

  const dashboardBase = trimSlash(ctx.dashboardUrl);
  const productsHref = `${dashboardBase}/products`;
  const paymentsHref = `${dashboardBase}/settings/payments`;
  const publishHref = `${dashboardBase}/store/publish`;

  // Inline link style — matches the brand-primary colour used by the
  // CTA button in `renderHaaEmail`. Email clients strip <style> blocks,
  // so colours must live on each <a>.
  const LINK_STYLE = 'color: #5c9cd5; text-decoration: none; font-weight: 600;';

  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مرحباً ${escapeHtml(ctx.merchantName)}،
    </p>
    <p style="margin: 0 0 12px;">
      تهانينا! تم تفعيل حسابك بنجاح ومتجرك <strong>${escapeHtml(ctx.storeName)}</strong>
      جاهز للانطلاق. نحن سعداء بانضمامك إلى هاء متاجر.
    </p>
    <p style="margin: 16px 0 8px;"><strong>خطواتك الأولى:</strong></p>
    <ol style="margin: 0; padding: 0 18px 0 0; color: #0f172a; line-height: 1.9;">
      <li style="margin: 0 0 6px;">
        <a href="${escapeHtml(productsHref)}" target="_blank" rel="noopener" style="${LINK_STYLE}">أضف أول منتجاتك</a>
      </li>
      <li style="margin: 0 0 6px;">
        <a href="${escapeHtml(paymentsHref)}" target="_blank" rel="noopener" style="${LINK_STYLE}">اربط وسيلة دفع</a>
      </li>
      <li style="margin: 0;">
        <a href="${escapeHtml(publishHref)}" target="_blank" rel="noopener" style="${LINK_STYLE}">انشر متجرك</a>
      </li>
    </ol>
    <div style="margin: 20px 0 0; padding: 14px 16px; background: #f5f7fa; border-radius: 12px; font-size: 14px;">
      <strong>متجرك:</strong>
      <a href="${escapeHtml(ctx.storeUrl)}" target="_blank" rel="noopener" style="${LINK_STYLE}">${escapeHtml(ctx.storeUrl)}</a>
    </div>
    <p style="margin: 20px 0 0; font-size: 14px; color: #475569;">
      نحن معك في كل خطوة — راسلنا في أي وقت على
      <a href="mailto:hello@haastores.com" style="${LINK_STYLE}">hello@haastores.com</a>
    </p>
  `;

  const html = renderHaaEmail({
    title: 'أهلاً بك في هاء متاجر',
    preheader,
    bodyHtml,
    cta: { label: 'افتح لوحة التحكم', href: ctx.dashboardUrl },
  });

  return { subject, html };
}

export type StorePublishedContext = {
  /** Merchant's display name (greeted by name in the lead paragraph). */
  merchantName: string;
  /** Store display name, surfaced in the subject + body lead. */
  storeName: string;
  /** Public storefront URL (e.g. `https://acme.haastores.com`). */
  storeUrl: string;
  /** Merchant dashboard base URL (e.g. `https://merchant.haastores.com`). */
  dashboardUrl: string;
};

/**
 * "🎉 متجرك ${storeName} مُتاح الآن للعملاء"
 *
 * Sent ONCE the moment `PublishGateService.publish` flips publishStatus
 * to 'published'. Different from the welcome email (which fires on
 * signup verify): this is the "your store is live" celebration with a
 * direct link to share with customers.
 *
 * Pure function: no DB access, no provider invocation, no side
 * effects. The caller (`PublishGateService.publish`) handles provider
 * selection + fire-and-forget dispatch — failure here must never fail
 * the publish response. The DB row (`stores.publish_status`) is the
 * source of truth.
 *
 * Arabic-first, RTL. Every user-supplied string flows through
 * `escapeHtml` before being interpolated into the body — the shared
 * `renderHaaEmail` template does NOT auto-escape its `bodyHtml` field.
 */
export function renderStorePublishedEmail(
  ctx: StorePublishedContext,
): { subject: string; html: string } {
  const subject = `🎉 متجرك ${ctx.storeName} مُتاح الآن للعملاء`;
  const preheader = 'شارك رابط متجرك مع عملائك الآن.';

  const dashboardBase = trimSlash(ctx.dashboardUrl);
  const promotionsHref = `${dashboardBase}/promotions`;
  const ordersHref = `${dashboardBase}/orders`;

  // Inline link style — matches the brand-primary colour used by the
  // CTA button in `renderHaaEmail`. Email clients strip <style> blocks,
  // so colours must live on each <a>.
  const LINK_STYLE = 'color: #5c9cd5; text-decoration: none; font-weight: 600;';

  const bodyHtml = `
    <p style="margin: 0 0 12px;">
      مبروك ${escapeHtml(ctx.merchantName)}،
    </p>
    <p style="margin: 0 0 12px;">
      متجرك <strong>${escapeHtml(ctx.storeName)}</strong> أصبح متاحاً للعملاء.
      هذه لحظة الانطلاق — شارك الرابط مع جمهورك واستقبل أول الطلبات.
    </p>
    <div style="margin: 16px 0; padding: 14px 16px; background: #f5f7fa; border-radius: 12px; font-size: 14px;">
      <strong>رابط متجرك:</strong>
      <a href="${escapeHtml(ctx.storeUrl)}" target="_blank" rel="noopener" style="${LINK_STYLE}">${escapeHtml(ctx.storeUrl)}</a>
    </div>
    <p style="margin: 16px 0 8px;"><strong>خطواتك التالية:</strong></p>
    <ol style="margin: 0; padding: 0 18px 0 0; color: #0f172a; line-height: 1.9;">
      <li style="margin: 0 0 6px;">
        شارك رابط متجرك على وسائل التواصل
      </li>
      <li style="margin: 0 0 6px;">
        <a href="${escapeHtml(promotionsHref)}" target="_blank" rel="noopener" style="${LINK_STYLE}">أضف منتجاتك بالعروض الترويجية</a>
      </li>
      <li style="margin: 0;">
        <a href="${escapeHtml(ordersHref)}" target="_blank" rel="noopener" style="${LINK_STYLE}">راقب أول الطلبات من لوحة التحكم</a>
      </li>
    </ol>
    <p style="margin: 20px 0 0; font-size: 14px; color: #475569;">
      نتمنى لك بداية موفقة — راسلنا في أي وقت على
      <a href="mailto:hello@haastores.com" style="${LINK_STYLE}">hello@haastores.com</a>
    </p>
  `;

  const html = renderHaaEmail({
    title: 'متجرك مُتاح الآن',
    preheader,
    bodyHtml,
    cta: { label: 'افتح متجري', href: ctx.storeUrl },
  });

  return { subject, html };
}
