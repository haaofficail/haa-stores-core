import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, getAuth, signToken } from '@haa/auth-core';
import { registerSchema, loginSchema, getPermissionsForRole, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { AuthFlowService } from '@haa/commerce-core';

export const authRouter = new Hono();

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
      // Both `email_taken` and `slug_taken` are 409 Conflicts.
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
    const result = await service.login(
      { email: body.email, password: body.password, ipAddress, userAgent },
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

// GET /auth/google — redirect to Google OAuth
authRouter.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return c.json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Google OAuth not configured' } }, 503);

  const redirectUri = `${process.env.API_BASE_URL || ''}/api/auth/google/callback`;
  const scope = 'openid email profile';
  const state = Buffer.from(Math.random().toString(36)).toString('base64');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');

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
  if (error || !code) {
    return c.json({ success: false, error: { code: 'OAUTH_DENIED', message: error || 'No code received' } }, 400);
  }

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
