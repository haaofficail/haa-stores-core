import { Hono } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { PaymentWebhookService, type PaymentWebhookResult, WhatsAppCampaignService, mapDeliveryStatus } from '@haa/commerce-core';
import type { ProviderCode } from '@haa/shared';

const webhooksRouter = new Hono();

/** مقارنة توكن webhook بزمن ثابت (fail-closed على اختلاف الطول) */
function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Inbound payment webhooks — POST /webhooks/payments/:provider
 *
 * Receives and verifies incoming payment provider webhooks.
 * The route is a thin transport shell. All business logic
 * (signature verify, dedup, provider call, post-payment
 * orchestration, atomicity, TASK-0030 platform-fee snapshot)
 * lives in PaymentWebhookService in @haa/commerce-core.
 *
 * As part of Quality Pass 5 Route Migration 18/24, the route
 * was reduced from ~146 lines of mixed transport + business
 * logic to this short transport shell.
 */
webhooksRouter.post('/payments/:provider', async (c) => {
  const providerCode = c.req.param('provider') as ProviderCode;

  // HTTP transport concerns: raw body + signature headers.
  // Reading the raw body is required because the provider
  // signature is computed over the exact bytes the provider
  // sent, not over a re-serialized JSON parse.
  const rawBody = await c.req.text();
  const signature = c.req.header('x-moyasar-signature')
    || c.req.header('x-signature')
    || c.req.header('x-notification-token')
    || '';
  const idempotencyKey = c.req.header('x-idempotency-key')
    || c.req.header('idempotency-key')
    || undefined;

  const result: PaymentWebhookResult = await new PaymentWebhookService().process({
    providerCode,
    rawBody,
    signature,
    idempotencyKey,
  });

  if (!result.success) {
    return c.json(
      { success: false, error: { code: result.code, message: result.message } },
      result.httpStatus,
    );
  }
  return c.json({ success: true, data: result.data });
});

/**
 * Inbound WhatsApp webhook — POST /webhooks/whatsapp/inbound  (QA WA2)
 *
 * يستقبل رسائل العملاء الواردة من المزوّد (Unifonic) ويطبّق إلغاء الاشتراك
 * (STOP / إيقاف) امتثالاً تنظيمياً. الأمان: توكن مشترك بزمن ثابت.
 * fail-closed: إن لم يُضبط WHATSAPP_WEBHOOK_SECRET فالمسار معطّل (503).
 *
 * يعيد 200 دائماً بعد المصادقة لمنع إعادة محاولات المزوّد، حتى لو لم يطابق رقمٌ
 * أو لم تكن الرسالة أمر إلغاء — فالاستلام نجح والمعالجة تمّت.
 */
webhooksRouter.post('/whatsapp/inbound', async (c) => {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) {
    return c.json({ success: false, error: { code: 'webhook_disabled', message: 'WhatsApp inbound webhook not configured' } }, 503);
  }

  const provided = c.req.header('x-webhook-token') || c.req.query('token') || '';
  if (!tokenMatches(provided, expected)) {
    return c.json({ success: false, error: { code: 'unauthorized', message: 'Invalid webhook token' } }, 401);
  }

  // الصيغة تختلف بين خطط Unifonic؛ التقط الحقول المحتملة بتحفّظ
  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ success: false, error: { code: 'bad_request', message: 'Invalid JSON' } }, 400);
  }

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = payload[k] ?? payload[k.toLowerCase()] ?? payload[k.toUpperCase()];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  const phone = pick('Sender', 'sender', 'From', 'from', 'msisdn');
  const body = pick('Body', 'body', 'Message', 'message', 'Text', 'text');

  if (!phone) {
    return c.json({ success: true, data: { action: 'none', matched: 0 } });
  }

  const result = await new WhatsAppCampaignService().processInboundMessage({ phone, body });
  return c.json({ success: true, data: result });
});

/**
 * WhatsApp delivery receipts — POST /webhooks/whatsapp/status  (QA WA5)
 *
 * يستقبل إيصالات التسليم/القراءة (DLR) من المزوّد ويحدّث حالة الإرسال
 * وعدّادات الحملة. نفس حماية التوكن بزمن ثابت و fail-closed مثل inbound.
 */
webhooksRouter.post('/whatsapp/status', async (c) => {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) {
    return c.json({ success: false, error: { code: 'webhook_disabled', message: 'WhatsApp status webhook not configured' } }, 503);
  }

  const provided = c.req.header('x-webhook-token') || c.req.query('token') || '';
  if (!tokenMatches(provided, expected)) {
    return c.json({ success: false, error: { code: 'unauthorized', message: 'Invalid webhook token' } }, 401);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ success: false, error: { code: 'bad_request', message: 'Invalid JSON' } }, 400);
  }

  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = payload[k] ?? payload[k.toLowerCase()] ?? payload[k.toUpperCase()];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  const messageId = pick('MessageID', 'messageId', 'message_id', 'id');
  const status = mapDeliveryStatus(pick('Status', 'status', 'event', 'MessageStatus'));

  if (!messageId || !status) {
    return c.json({ success: true, data: { matched: false } });
  }

  const result = await new WhatsAppCampaignService().recordDeliveryStatus({ messageId, status });
  return c.json({ success: true, data: result });
});

export { webhooksRouter };
