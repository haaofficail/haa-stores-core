// Public landing-page contact endpoint.
//
// Mounted at `/landing` in apps/api/src/index.ts. Caddy strips `/api/`
// before forwarding, so the public URL is `/api/landing/contact`.
//
// Defenses (in order):
//   1. `rateLimiter` middleware — 5 requests/hour per IP+method+path.
//   2. Honeypot field `website` — bots fill every visible-looking field;
//      the schema enforces `max(0)`. We also silently 200 if it's set,
//      so the bot can't tell its trick was detected.
//   3. Zod schema mirroring the storefront form constraints.
//   4. App-layer DB-backed counter (`countRecentByIp`) — survives a
//      process restart that would reset the in-memory middleware
//      counter. Same 5/hour ceiling.
//   5. Email goes out fire-and-forget AFTER the row is committed; a
//      failed email never blocks or rolls back the submission, because
//      the DB row is the source of truth for admin follow-up.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { LandingContactsService } from '@haa/commerce-core';
import { rateLimiter } from '../middleware/rate-limiter.js';
import {
  ResendEmailProvider,
  SmtpEmailProvider,
  type NotificationProvider,
} from '@haa/notification-core';

const landingRouter = new Hono();

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  phone: z.string().max(30).optional().nullable(),
  message: z.string().min(10).max(5000),
  // Honeypot — must be empty. Bots fill every field they see.
  website: z.string().max(0).optional(),
});

landingRouter.post(
  '/contact',
  rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'تم تجاوز الحد المسموح من الرسائل لهذه الساعة. حاول لاحقاً.',
  }),
  zValidator('json', contactSchema),
  async (c) => {
    const body = c.req.valid('json');

    // Honeypot tripped — silently absorb so the bot doesn't learn.
    if (body.website && body.website.length > 0) {
      return c.json({ success: true, data: { id: 0 } });
    }

    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? null;
    const ua = c.req.header('user-agent') ?? null;

    const service = new LandingContactsService();

    // App-layer extra throttle: 5/hour per IP. Defense-in-depth alongside
    // the rateLimiter middleware (which lives in-memory by default and
    // resets on restart).
    if (ip) {
      const recent = await service.countRecentByIp(ip, 60 * 60 * 1000);
      if (recent >= 5) {
        return c.json({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'تم تجاوز الحد المسموح. حاول لاحقاً.' },
        }, 429);
      }
    }

    try {
      const row = await service.create({
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        message: body.message,
        sourceIp: ip,
        userAgent: ua,
      });

      // Fire-and-forget admin notification. A provider error must not
      // affect the submitter's response — the DB row is the source of
      // truth and the admin inbox is the recovery path.
      void notifyAdmin(row).catch((err) => {
        console.error('[landing-contact] notify failed:', err instanceof Error ? err.message : err);
      });

      return c.json({ success: true, data: { id: row.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown';
      if (message === 'VALIDATION_ERROR') {
        return c.json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'البيانات غير صالحة' },
        }, 400);
      }
      console.error('[landing-contact] create failed:', message);
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'حدث خطأ. حاول لاحقاً.' },
      }, 500);
    }
  },
);

/**
 * Send an admin email for a fresh submission.
 *
 * Why we hit a provider directly (not `NotificationService`):
 * `NotificationService.send(storeId, templateCode, data)` is store-scoped
 * — it looks up `notification_preferences` rows by `storeId` and only
 * sends if that store has opted into the channel for that template code.
 * Landing-page submissions are platform-level (no storeId), so we pick
 * the first available provider and hand it a built email.
 *
 * Provider precedence:
 *   1. SmtpEmailProvider  — when `SMTP_HOST/PORT/USER/PASSWORD` are set
 *      (Hostinger / Workspace / Outlook — merchant owns deliverability)
 *   2. ResendEmailProvider — when `RESEND_API_KEY` is set
 *
 * If neither is configured, the function no-ops; the DB row remains as
 * the source of truth and the admin inbox UI surfaces it.
 */
function pickEmailProvider(): NotificationProvider | null {
  const smtp = new SmtpEmailProvider();
  if (smtp.isAvailable) return smtp;
  const resend = new ResendEmailProvider();
  if (resend.isAvailable) return resend;
  return null;
}

async function notifyAdmin(row: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
}): Promise<void> {
  const provider = pickEmailProvider();
  if (!provider) {
    // No provider configured — no-op. Admin inbox UI is the recovery path.
    return;
  }

  const to = process.env.LANDING_CONTACT_ADMIN_EMAIL || 'hello@haastores.com';
  const subject = `[Haa Landing] ${row.name} — استفسار جديد`;
  const lines = [
    'استلمنا استفساراً جديداً من صفحة هاء متاجر الرئيسية.',
    '',
    `الاسم: ${row.name}`,
    `البريد: ${row.email}`,
    row.phone ? `الجوال: ${row.phone}` : null,
    '',
    'الرسالة:',
    row.message,
    '',
    `— نظام إشعارات هاء متاجر (#${row.id})`,
  ].filter((line): line is string => line !== null);

  // Provider expects HTML; wrap the plain-text body in a <pre> so RTL
  // newlines render. Subject is the same string for both.
  const html = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;direction:rtl;text-align:right;">${escapeHtml(lines.join('\n'))}</pre>`;

  const result = await provider.send({
    recipient: to,
    subject,
    body: html,
    metadata: { source: 'landing_contact', rowId: row.id },
  });
  if (!result.success) {
    // Surface the provider error to logs without throwing — caller is
    // already wrapped in a .catch().
    throw new Error(`provider error: ${result.error ?? 'unknown'}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { landingRouter };
