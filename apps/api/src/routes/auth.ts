import { Hono } from 'hono';
import type { Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, getAuth, signToken } from '@haa/auth-core';
import { registerSchema, loginSchema, getPermissionsForRole, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { AuthFlowService } from '@haa/commerce-core';

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
