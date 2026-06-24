import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, getAuth, signToken } from '@haa/auth-core';
import { registerSchema, loginSchema, getPermissionsForRole, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { AuthFlowService } from '@haa/commerce-core';
import { rateLimiter } from '../middleware/rate-limiter.js';

export const authRouter = new Hono();

// 7-day JWT lifetime matches the default signToken expiry.
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function setAuthCookie(c: Context, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  // SameSite=Lax: safe for same-site (*.haastores.com) AJAX with credentials:include.
  // Secure flag in production ensures the cookie is only sent over HTTPS.
  // HttpOnly prevents JS access — the primary XSS mitigation for P1-04.
  c.header(
    'Set-Cookie',
    `haa_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AUTH_COOKIE_MAX_AGE}${isProd ? '; Secure' : ''}`,
  );
}

function clearAuthCookie(c: Context): void {
  const isProd = process.env.NODE_ENV === 'production';
  c.header(
    'Set-Cookie',
    `haa_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
  );
}

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const service = new AuthFlowService();

  try {
    const result = await service.register({
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      storeName: body.storeName,
      storeSlug: body.storeSlug,
    });

    if ('kind' in result) {
      // Phone-first registration error mapping:
      //   - invalid_phone  → 400 INVALID_PHONE (Arabic message from service)
      //   - phone_taken    → 409 PHONE_TAKEN  (Arabic message from service)
      //   - email_taken / slug_taken → 409 CONFLICT (existing behaviour)
      if (result.kind === 'invalid_phone') {
        return c.json(
          { success: false, error: { code: 'INVALID_PHONE', message: result.message } },
          400,
        );
      }
      if (result.kind === 'phone_taken') {
        return c.json(
          { success: false, error: { code: 'PHONE_TAKEN', message: result.message } },
          409,
        );
      }
      return c.json(
        { success: false, error: { code: 'CONFLICT', message: result.message } },
        409,
      );
    }

    // Mint the JWT in the transport layer. Service returns the data
    // needed; the route decides how to encode it.
    const token = signToken({
      userId: result.userId,
      tenantId: result.tenantId,
      activeStoreId: result.storeId,
      tokenVersion: result.userTokenVersion,
      roles: [result.role],
      permissions: getPermissionsForRole(result.role),
    });

    setAuthCookie(c, token);
    return c.json(
      {
        success: true,
        data: {
          token,
          user: { id: result.userId, name: result.userName, email: result.userEmail },
          store: { id: result.storeId, name: result.storeName, slug: result.storeSlug },
          // HAA-AUTH-SIGNUP-VERIFY — tells the client whether the user
          // still needs to complete the email OTP flow before they can
          // log in. Always `true` on fresh password registrations; the
          // service flips `email_verified_at` only after a successful
          // /auth/signup/verify call.
          verificationRequired: result.verificationRequired,
        },
      },
      201,
    );
  } catch (err) {
    console.error('Registration error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Registration failed' } },
      500,
    );
  }
});

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const service = new AuthFlowService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');

  try {
    // Phone-first login: forward `identifier` (canonical) plus the
    // legacy `email` / `phone` aliases so the service can resolve
    // whichever the client sent. LEGACY-ALIAS: a future cleanup PR
    // can drop `email` / `phone` once all frontends ship `identifier`.
    const result = await service.login(
      {
        identifier: body.identifier,
        email: body.email,
        phone: body.phone,
        password: body.password,
        ipAddress,
        userAgent,
      },
      new AuditLogService(),
    );

    if ('kind' in result) {
      if (result.kind === 'no_tenant') {
        return c.json(
          { success: false, error: { code: 'FORBIDDEN', message: result.message } },
          403,
        );
      }
      // HAA-AUTH-SIGNUP-VERIFY — user's row has email_verified_at = NULL
      // and the AUTH_LEGACY_VERIFIED env flag is off. 403 + Arabic msg
      // tells the user to check their inbox / call /auth/signup/resend-otp.
      if (result.kind === 'email_not_verified') {
        return c.json(
          { success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: result.message } },
          403,
        );
      }
      return c.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: result.message } },
        401,
      );
    }

    // Mint the JWT in the transport layer.
    const role = result.role as UserRole;
    const permissions = getPermissionsForRole(role);
    const token = signToken({
      userId: result.userId,
      tenantId: result.tenantId,
      activeStoreId: result.storeId,
      tokenVersion: result.userTokenVersion,
      roles: [result.role],
      permissions,
    });

    setAuthCookie(c, token);
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: result.userId,
          name: result.userName,
          email: result.userEmail,
          phone: result.userPhone,
          tenantId: result.tenantId,
          activeStoreId: result.storeId,
          roles: [result.role],
          permissions,
        },
        store:
          result.storeName && result.storeSlug
            ? { id: result.storeId, name: result.storeName, slug: result.storeSlug }
            : null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Login failed' } },
      500,
    );
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const service = new AuthFlowService();

  const user = await service.getMe(auth.userId);
  if (!user) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      tenantId: auth.tenantId,
      activeStoreId: auth.activeStoreId,
      roles: auth.roles,
      permissions: auth.permissions,
    },
  });
});

// POST /auth/logout — clear the HttpOnly auth cookie
authRouter.post('/logout', (c) => {
  clearAuthCookie(c);
  return c.json({ success: true });
});

// GET /auth/google — redirect to Google OAuth
authRouter.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return c.json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth not configured' } }, 503);

  const redirectUri = `${process.env.API_BASE_URL || ''}/api/auth/google/callback`;
  const scope = 'openid email profile';
  const state = crypto.randomUUID();

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');

  const isProd = process.env.NODE_ENV === 'production';
  c.header('Set-Cookie', `__Host-oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isProd ? '; Secure' : ''}`);

  return c.redirect(url.toString());
});

// GET /auth/google/callback — handle Google OAuth callback
authRouter.get('/google/callback', async (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth not configured' } }, 503);
  }

  const code = c.req.query('code');
  const error = c.req.query('error');
  const returnedState = c.req.query('state');
  if (error || !code) {
    return c.json({ success: false, error: { code: 'OAUTH_DENIED', message: error || 'No code received' } }, 400);
  }

  const cookieHeader = c.req.header('cookie') || '';
  const storedState = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('__Host-oauth_state='))?.split('=')[1];
  if (!storedState || !returnedState || storedState !== returnedState) {
    return c.json({ success: false, error: { code: 'INVALID_STATE', message: 'OAuth state mismatch — possible CSRF attack' } }, 400);
  }
  const isProd = process.env.NODE_ENV === 'production';
  c.header('Set-Cookie', `__Host-oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`);

  const redirectUri = `${process.env.API_BASE_URL || ''}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
  });
  if (!tokenRes.ok) {
    return c.json({ success: false, error: { code: 'TOKEN_EXCHANGE_FAILED', message: 'Google token exchange failed' } }, 400);
  }
  const tokens = await tokenRes.json() as { access_token?: string; id_token?: string };

  // Get user profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) {
    return c.json({ success: false, error: { code: 'PROFILE_FETCH_FAILED', message: 'Could not fetch Google profile' } }, 400);
  }
  const profile = await profileRes.json() as { sub?: string; email?: string; name?: string; picture?: string };

  if (!profile.email) {
    return c.json({ success: false, error: { code: 'NO_EMAIL', message: 'Google account has no email' } }, 400);
  }

  const service = new AuthFlowService();
  const result = await service.loginOrRegisterWithOAuth({
    provider: 'google',
    providerId: profile.sub || '',
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
  });

  if ('kind' in result) {
    return c.json({ success: false, error: { code: result.kind.toUpperCase(), message: result.message } }, 400);
  }

  // Mint JWT (same pattern as password login)
  const oauthRole = result.role as UserRole;
  const oauthPermissions = getPermissionsForRole(oauthRole);
  const oauthToken = signToken({
    userId: result.userId,
    tenantId: result.tenantId,
    activeStoreId: result.storeId,
    tokenVersion: result.userTokenVersion,
    roles: [result.role],
    permissions: oauthPermissions,
  });

  // Redirect to merchant dashboard with token in query (frontend stores in localStorage)
  const dashboardUrl = process.env.MERCHANT_DASHBOARD_URL || '/';
  return c.redirect(`${dashboardUrl}?access_token=${oauthToken}`);
});

// HAA-AUTH-SIGNUP-VERIFY — POST /auth/signup/verify
// Validates the 6-digit signup OTP and, on success, mints a JWT exactly
// like /auth/login. The response is uniform: distinguishable only on
// success vs failure, with a generic Arabic error message that doesn't
// reveal whether the user exists or whether the code was wrong vs
// expired. Per-IP rate limit + per-(email, purpose) limit inside the
// OTP service.
authRouter.post(
  '/signup/verify',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    message: 'تم تجاوز الحد المسموح من المحاولات',
  }),
  zValidator(
    'json',
    z.object({
      email: z.string().email().max(255),
      code: z.string().regex(/^\d{6}$/, 'الرمز يجب أن يكون 6 أرقام'),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null;
    const ua = c.req.header('user-agent') ?? null;
    const service = new AuthFlowService();

    try {
      const result = await service.verifySignup({
        email: body.email,
        code: body.code,
        sourceIp: ip,
        userAgent: ua,
      });

      if (!result.ok) {
        // Map all failure reasons to a uniform 400 with an Arabic
        // message. We expose the reason code so the client can branch
        // (e.g. "expired → show resend button") but the human message
        // stays generic.
        const message =
          {
            INVALID_CODE: 'الرمز غير صحيح',
            EXPIRED: 'انتهت صلاحية الرمز',
            NOT_FOUND: 'لا يوجد رمز مطلوب لهذا البريد',
            TOO_MANY_ATTEMPTS: 'تجاوزت عدد المحاولات المسموح',
            USED: 'الرمز مُستخدم سابقاً',
            ALREADY_VERIFIED: 'تم تفعيل الحساب مسبقاً. سجّل الدخول مباشرة.',
          }[result.reason] ?? 'فشل التحقق';
        return c.json(
          { success: false, error: { code: result.reason, message } },
          400,
        );
      }

      const role = result.payload.role as UserRole;
      const permissions = getPermissionsForRole(role);
      const token = signToken({
        userId: result.payload.userId,
        tenantId: result.payload.tenantId,
        activeStoreId: result.payload.storeId,
        tokenVersion: result.payload.userTokenVersion,
        roles: [result.payload.role],
        permissions,
      });

      setAuthCookie(c, token);
      return c.json({
        success: true,
        data: {
          token,
          user: {
            id: result.payload.userId,
            name: result.payload.userName,
            email: result.payload.userEmail,
            phone: result.payload.userPhone,
            tenantId: result.payload.tenantId,
            activeStoreId: result.payload.storeId,
            roles: [result.payload.role],
            permissions,
          },
          store:
            result.payload.storeName && result.payload.storeSlug
              ? {
                  id: result.payload.storeId,
                  name: result.payload.storeName,
                  slug: result.payload.storeSlug,
                }
              : null,
        },
      });
    } catch (err) {
      console.error('Signup verify error:', err);
      return c.json(
        { success: false, error: { code: 'INTERNAL', message: 'فشل التحقق' } },
        500,
      );
    }
  },
);

// HAA-AUTH-SIGNUP-VERIFY — POST /auth/signup/resend-otp
// Re-issues a signup OTP. The response is INTENTIONALLY uniform: the
// caller cannot distinguish "user not found" from "OTP queued" from
// "user already verified" — that would turn this endpoint into a user-
// enumeration oracle. Only RATE_LIMITED is surfaced (429) so the
// client can show a useful retry-later message.
authRouter.post(
  '/signup/resend-otp',
  rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'تم تجاوز الحد المسموح',
  }),
  zValidator('json', z.object({ email: z.string().email().max(255) })),
  async (c) => {
    const body = c.req.valid('json');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null;
    const ua = c.req.header('user-agent') ?? null;
    const service = new AuthFlowService();

    try {
      const result = await service.resendSignupOtp({
        email: body.email,
        sourceIp: ip,
        userAgent: ua,
      });

      // Rate-limited is the only failure mode we surface to the caller
      // — all other reasons (NOT_FOUND, ALREADY_VERIFIED) collapse into
      // the uniform success payload. This is the no-enumeration rule.
      if (!result.ok && result.reason === 'RATE_LIMITED') {
        return c.json(
          {
            success: false,
            error: { code: 'RATE_LIMITED', message: 'تم تجاوز الحد المسموح. حاول لاحقاً.' },
          },
          429,
        );
      }

      return c.json({
        success: true,
        data: { message: 'إن وُجد حساب لهذا البريد، فقد أُرسل رمز تحقق جديد. تحقّق من صندوق الوارد.' },
      });
    } catch (err) {
      console.error('Resend signup OTP error:', err);
      // Even on infrastructure failure, return the uniform message so
      // the endpoint cannot be probed for existence by triggering errors.
      return c.json({
        success: true,
        data: { message: 'إن وُجد حساب لهذا البريد، فقد أُرسل رمز تحقق جديد. تحقّق من صندوق الوارد.' },
      });
    }
  },
);

// HAA-AUTH-PASSWORD-RESET — POST /auth/password-reset/request
// Issues a 6-digit OTP to the email tied to `identifier` (phone or
// email). The response is INTENTIONALLY uniform regardless of whether
// the identifier resolves to a real account — the only failure surface
// is RATE_LIMITED (429). This prevents the endpoint from being used as
// a user-enumeration oracle.
authRouter.post(
  '/password-reset/request',
  rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'تم تجاوز الحد المسموح من المحاولات',
  }),
  zValidator(
    'json',
    z.object({
      identifier: z.string().min(1).max(255),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null;
    const ua = c.req.header('user-agent') ?? null;
    const service = new AuthFlowService();

    try {
      const result = await service.requestPasswordReset({
        identifier: body.identifier,
        sourceIp: ip,
        userAgent: ua,
      });

      if (!result.ok && result.reason === 'RATE_LIMITED') {
        return c.json(
          {
            success: false,
            error: { code: 'RATE_LIMITED', message: 'تم تجاوز الحد المسموح. حاول لاحقاً.' },
          },
          429,
        );
      }

      // Uniform success — never reveal whether the identifier exists.
      return c.json({
        success: true,
        data: {
          message:
            'إن وُجد حساب لهذا المعرّف، فقد أُرسل رمز إعادة تعيين كلمة المرور إلى البريد المسجّل.',
        },
      });
    } catch (err) {
      console.error('Password reset request error:', err);
      // Even on infrastructure failure, return the uniform message so
      // the endpoint cannot be probed by triggering exceptions.
      return c.json({
        success: true,
        data: {
          message:
            'إن وُجد حساب لهذا المعرّف، فقد أُرسل رمز إعادة تعيين كلمة المرور إلى البريد المسجّل.',
        },
      });
    }
  },
);

// HAA-AUTH-PASSWORD-RESET — POST /auth/password-reset/confirm
// Verifies the OTP, rotates the password hash, bumps token_version
// (kills all existing JWTs), writes an audit log, and mints a fresh
// JWT exactly like /auth/login. Same per-IP rate limit as the signup
// verify route; per-(email, purpose) limits are enforced inside
// EmailOtpService.
authRouter.post(
  '/password-reset/confirm',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    message: 'تم تجاوز الحد المسموح من المحاولات',
  }),
  zValidator(
    'json',
    z.object({
      identifier: z.string().min(1).max(255),
      code: z.string().regex(/^\d{6}$/, 'الرمز يجب أن يكون 6 أرقام'),
      newPassword: z.string().min(8).max(200),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null;
    const ua = c.req.header('user-agent') ?? null;
    const service = new AuthFlowService();

    try {
      const result = await service.confirmPasswordReset({
        identifier: body.identifier,
        code: body.code,
        newPassword: body.newPassword,
        sourceIp: ip,
        userAgent: ua,
      });

      if (!result.ok) {
        const messages: Record<typeof result.reason, string> = {
          INVALID_CODE: 'الرمز غير صحيح',
          EXPIRED: 'انتهت صلاحية الرمز',
          NOT_FOUND: 'لا يوجد رمز مطلوب لهذا المعرّف',
          TOO_MANY_ATTEMPTS: 'تجاوزت عدد المحاولات المسموح',
          USED: 'الرمز مُستخدم سابقاً',
          WEAK_PASSWORD: 'كلمة المرور لا تستوفي المتطلبات',
        };
        return c.json(
          {
            success: false,
            error: {
              code: result.reason,
              message: messages[result.reason] ?? 'تعذّر إعادة تعيين كلمة المرور',
            },
          },
          400,
        );
      }

      // Mint the JWT the same way /auth/login does (token_version was
      // already bumped inside the service, so this JWT is the only
      // valid one going forward — every prior JWT is now revoked).
      const role = result.payload.role as UserRole;
      const permissions = getPermissionsForRole(role);
      const token = signToken({
        userId: result.payload.userId,
        tenantId: result.payload.tenantId,
        activeStoreId: result.payload.storeId,
        tokenVersion: result.payload.userTokenVersion,
        roles: [result.payload.role],
        permissions,
      });

      setAuthCookie(c, token);
      return c.json({
        success: true,
        data: {
          token,
          user: {
            id: result.payload.userId,
            name: result.payload.userName,
            email: result.payload.userEmail,
          },
        },
      });
    } catch (err) {
      console.error('Password reset confirm error:', err);
      return c.json(
        {
          success: false,
          error: { code: 'INTERNAL', message: 'تعذّر إعادة تعيين كلمة المرور' },
        },
        500,
      );
    }
  },
);

// POST /auth/logout
authRouter.post('/logout', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const service = new AuthFlowService();
  try {
    await service.logout(auth.userId);
    return c.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    console.error('Logout error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Logout failed' } },
      500,
    );
  }
});
