// /api/admin/login — extracted from admin.ts lines 41-63.
// This is the ONLY admin route that does NOT require an existing token.
//
// Exported as a plain Hono handler. The aggregator in ./index.ts applies
// the zValidator middleware when registering the route.

import { AdminAuthService } from '@haa/auth-core';

export async function loginRoute(c: any) {
  const { email, password } = c.req.valid('json');
  const service = new AdminAuthService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');

  const result = await service.login({ email, password, ipAddress, userAgent });

  if ('kind' in result) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: result.message } },
      401,
    );
  }

  return c.json({ success: true, data: result });
}
