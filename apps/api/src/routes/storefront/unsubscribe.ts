// Public unsubscribe endpoint — PDPL Article 18.
//
// Flow:
//   1. Email footer renders a link of the form
//      `https://${storefront}/s/${slug}/unsubscribe/${token}`.
//   2. Customer clicks → this handler verifies the token + marks
//      `customers.email_opt_out_at = NOW()` + returns a confirmation
//      HTML page in Arabic.
//   3. Marketing + cart-recovery sends check `isCustomerOptedOut`
//      before the next send and skip.
//
// Security:
//   - Token is HMAC-signed with UNSUBSCRIBE_TOKEN_SECRET (or JWT_SECRET).
//   - 30-day TTL prevents reused links from old emails.
//   - Unknown / expired / tampered tokens return the same generic 400
//     page — no enumeration leak.
//   - GET-only is intentional. Email clients prefetch links, so the
//     write is idempotent: a prefetched click is fine, the customer's
//     real click hits the already-opted-out state and shows the same
//     confirmation. We accept that prefetching MAY opt out a customer
//     who didn't actually click — but that's a strictly safer failure
//     mode than ignoring opt-outs.

import { Hono } from 'hono';
import { markCustomerOptedOut, verifyUnsubscribeToken } from '@haa/commerce-core';
import { escapeHtml } from '@haa/notification-core';
import { resolveActiveStore } from './_shared.js';

export const unsubscribeRouter = new Hono();

function renderConfirmation(opts: { storeName: string; success: boolean; reason?: string }): string {
  const title = opts.success
    ? 'تم إلغاء الاشتراك بنجاح'
    : 'تعذّر إلغاء الاشتراك';
  const body = opts.success
    ? `<p>لن تستلم رسائل تسويقية أو تذكير سلة من ${escapeHtml(opts.storeName)} بعد الآن.</p>
       <p>الرسائل التشغيلية (تأكيد الطلب، تحديثات الشحن) ستبقى لأنها مرتبطة بطلباتك مباشرةً.</p>`
    : `<p>الرابط منتهي الصلاحية أو غير صالح. إذا كنت ترغب فعلاً في إلغاء الاشتراك،
       تواصل مع المتجر مباشرةً.</p>
       <p>السبب التقني: ${escapeHtml(opts.reason ?? 'unknown')}</p>`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','IBM Plex Sans Arabic',Tahoma,Arial,sans-serif; background:#f5f7fa; color:#0f172a; line-height:1.7; padding:48px 16px; }
    .card { max-width:560px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(15,23,42,0.06); }
    h1 { margin:0 0 16px; font-size:22px; font-weight:700; }
    p { margin:8px 0; font-size:15px; color:#1f2937; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </div>
</body>
</html>`;
}

unsubscribeRouter.get('/:slug/unsubscribe/:token', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const token = c.req.param('token') ?? '';
  const verified = verifyUnsubscribeToken(token);

  if (!verified || verified.storeId !== store.id) {
    return c.html(
      renderConfirmation({ storeName: store.name, success: false, reason: 'invalid_or_expired' }),
      400,
    );
  }

  await markCustomerOptedOut(verified.customerId, store.id, 'footer_link');
  return c.html(renderConfirmation({ storeName: store.name, success: true }));
});
