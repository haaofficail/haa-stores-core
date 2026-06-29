// /api/admin/login — extracted from admin.ts lines 41-63.
// This is the ONLY admin route that does NOT require an existing token.
//
// Exported as a plain Hono handler. The aggregator in ./index.ts applies
// the zValidator middleware when registering the route.

import type { Context } from 'hono';
import { AdminAuthService, type AdminAuthContext } from '@haa/auth-core';

type AdminContext = Context<{ Variables: { adminAuth: AdminAuthContext } }>;

interface AdminLoginBody {
  email: string;
  password: string;
  totpCode?: string;
}

interface AdminPasswordResetRequestBody {
  email: string;
}

interface AdminPasswordResetConfirmBody {
  email: string;
  code: string;
  newPassword: string;
}

interface AdminTotpCodeBody {
  code: string;
}

function validJson<T>(c: Context): T {
  return c.req.valid('json' as never) as T;
}

export async function loginRoute(c: Context) {
  const { email, password, totpCode } = validJson<AdminLoginBody>(c);
  const service = new AdminAuthService();
  const ipAddress = getClientIp(c);
  const userAgent = c.req.header('user-agent') ?? null;

  const result = await service.login({ email, password, totpCode, ipAddress, userAgent });

  if ('kind' in result) {
    if (result.kind === 'two_factor_required') {
      return c.json({
        success: true,
        data: {
          twoFactorRequired: true,
          message: result.message,
          user: result.user,
        },
      });
    }
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: result.message } },
      401,
    );
  }

  return c.json({ success: true, data: result });
}

export async function requestAdminPasswordResetRoute(c: Context) {
  const { email } = validJson<AdminPasswordResetRequestBody>(c);
  const service = new AdminAuthService();
  const result = await service.requestPasswordReset({
    email,
    sourceIp: getClientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });

  if (!result.ok && result.reason === 'RATE_LIMITED') {
    return c.json(
      { success: false, error: { code: 'RATE_LIMITED', message: 'تم تجاوز الحد المسموح. حاول لاحقاً.' } },
      429,
    );
  }

  return c.json({
    success: true,
    data: {
      message: 'إن وُجد حساب إدارة لهذا البريد، فقد أُرسل رمز إعادة تعيين كلمة المرور.',
    },
  });
}

export async function confirmAdminPasswordResetRoute(c: Context) {
  const { email, code, newPassword } = validJson<AdminPasswordResetConfirmBody>(c);
  const service = new AdminAuthService();
  const result = await service.confirmPasswordReset({
    email,
    code,
    newPassword,
    sourceIp: getClientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });

  if (!result.ok) {
    const status = result.reason === 'TOO_MANY_ATTEMPTS' ? 429 : 400;
    return c.json(
      { success: false, error: { code: result.reason, message: result.message } },
      status,
    );
  }

  return c.json({
    success: true,
    data: { message: 'تم تحديث كلمة مرور الإدارة. سجّل الدخول من جديد.' },
  });
}

export async function adminTotpStatusRoute(c: AdminContext) {
  const auth = c.get('adminAuth');
  const service = new AdminAuthService();
  const status = await service.getTotpStatus(auth.userId);
  return c.json({ success: true, data: status });
}

export async function startAdminTotpEnrollmentRoute(c: AdminContext) {
  const auth = c.get('adminAuth');
  const service = new AdminAuthService();
  const result = await service.startTotpEnrollment({
    userId: auth.userId,
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });

  if (!result.ok) {
    const status = result.reason === 'ENCRYPTION_NOT_CONFIGURED' ? 503 : 404;
    return c.json(
      { success: false, error: { code: result.reason, message: result.message } },
      status,
    );
  }

  return c.json({ success: true, data: result });
}

export async function confirmAdminTotpEnrollmentRoute(c: AdminContext) {
  const auth = c.get('adminAuth');
  const { code } = validJson<AdminTotpCodeBody>(c);
  const service = new AdminAuthService();
  const result = await service.confirmTotpEnrollment({
    userId: auth.userId,
    code,
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });

  if (!result.ok) {
    return c.json(
      { success: false, error: { code: result.reason, message: result.message } },
      result.reason === 'NOT_FOUND' ? 404 : 400,
    );
  }

  return c.json({ success: true, data: { message: 'تم تفعيل التحقق الثنائي.' } });
}

export async function disableAdminTotpRoute(c: AdminContext) {
  const auth = c.get('adminAuth');
  const { code } = validJson<AdminTotpCodeBody>(c);
  const service = new AdminAuthService();
  const result = await service.disableTotp({
    userId: auth.userId,
    code,
    ipAddress: getClientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });

  if (!result.ok) {
    return c.json(
      { success: false, error: { code: result.reason, message: result.message } },
      result.reason === 'NOT_FOUND' ? 404 : 400,
    );
  }

  return c.json({ success: true, data: { message: 'تم تعطيل التحقق الثنائي.' } });
}

function getClientIp(c: Context): string | null {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    ?? c.req.header('x-real-ip')
    ?? null;
}
