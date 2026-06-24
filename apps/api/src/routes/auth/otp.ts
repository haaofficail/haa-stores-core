// HAA-AUTH-OTP-001 — Public email OTP endpoints.
//
// POST /auth/otp/send   — issue a 6-digit code, deliver via email.
// POST /auth/otp/verify — verify a previously-issued code.
//
// Defensive notes:
//   - Both endpoints are unauthenticated by design (they MUST work
//     before the user has a session). They are listed in the rbac-
//     coverage DENY_LIST.
//   - Both endpoints are rate-limited at the middleware layer (per-IP).
//     `generateAndSend` enforces a SECOND, per-(email, purpose) limit
//     inside the service so a botnet rotating IPs still cannot flood
//     a single mailbox.
//   - The OTP code itself is NEVER returned in any HTTP response and
//     NEVER logged.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { EmailOtpService, EMAIL_OTP_PURPOSES, type EmailOtpPurpose } from '@haa/auth-core';
import { rateLimiter } from '../../middleware/rate-limiter.js';

const otpRouter = new Hono();

const purposeEnum = z.enum(EMAIL_OTP_PURPOSES as unknown as [string, ...string[]]);

const sendBody = z.object({
  email: z.string().email().max(255),
  purpose: purposeEnum,
});

const verifyBody = z.object({
  email: z.string().email().max(255),
  purpose: purposeEnum,
  code: z.string().regex(/^\d{6}$/, 'الرمز يجب أن يكون 6 أرقام'),
});

otpRouter.post(
  '/send',
  rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    message: 'تم تجاوز الحد المسموح من المحاولات.',
  }),
  zValidator('json', sendBody),
  async (c) => {
    const body = c.req.valid('json');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null;
    const ua = c.req.header('user-agent') ?? null;
    const result = await new EmailOtpService().generateAndSend({
      email: body.email,
      purpose: body.purpose as EmailOtpPurpose,
      sourceIp: ip,
      userAgent: ua,
    });
    if (!result.ok) {
      if (result.reason === 'RATE_LIMITED') {
        return c.json(
          { success: false, error: { code: 'RATE_LIMITED', message: result.message } },
          429,
        );
      }
      return c.json(
        {
          success: false,
          error: { code: result.reason, message: result.message ?? 'تعذّر الإرسال' },
        },
        500,
      );
    }
    // Do NOT return the code or otpId in the public payload.
    return c.json({ success: true, data: { sent: true, expiresAt: result.expiresAt } });
  },
);

otpRouter.post(
  '/verify',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    message: 'تم تجاوز الحد المسموح من المحاولات.',
  }),
  zValidator('json', verifyBody),
  async (c) => {
    const body = c.req.valid('json');
    const result = await new EmailOtpService().verify({
      email: body.email,
      purpose: body.purpose as EmailOtpPurpose,
      code: body.code,
    });
    if (!result.ok) {
      return c.json(
        {
          success: false,
          error: { code: result.reason, message: messageFor(result.reason) },
        },
        400,
      );
    }
    return c.json({ success: true, data: { verified: true, userId: result.userId } });
  },
);

function messageFor(reason: string): string {
  return (
    (
      {
        NOT_FOUND: 'لا يوجد رمز مطلوب لهذا البريد',
        EXPIRED: 'انتهت صلاحية الرمز',
        USED: 'الرمز مُستخدم سابقاً',
        TOO_MANY_ATTEMPTS: 'تجاوزت عدد المحاولات المسموح',
        INVALID_CODE: 'الرمز غير صحيح',
      } as Record<string, string>
    )[reason] ?? 'فشل التحقق'
  );
}

export { otpRouter };
