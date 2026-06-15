// /api/admin/login — extracted from admin.ts lines 41-63.
// This is the ONLY admin route that does NOT require an existing token.
//
// Exported as a plain Hono handler. The aggregator in ./index.ts applies
// the zValidator middleware when registering the route.

import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { verifyPassword, signAdminToken } from '@haa/auth-core';
import { AuditLogService } from '@haa/integration-core';

export async function loginRoute(c: any) {
  const { email, password } = c.req.valid('json');
  const db = createDbClient();
  const audit = new AuditLogService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (!user || !user.isAdmin || !user.isActive) {
    await audit.record({ action: 'admin_login_failed', entityType: 'user', entityId: user?.id, ipAddress, userAgent });
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid admin credentials' } }, 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await audit.record({ actorUserId: user.id, action: 'admin_login_failed', entityType: 'user', entityId: user.id, ipAddress, userAgent });
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid admin credentials' } }, 401);
  }
  const token = signAdminToken({ userId: user.id, isAdmin: true, permissions: ['admin:*'] });
  await audit.record({ actorUserId: user.id, action: 'admin_login', entityType: 'user', entityId: user.id, ipAddress, userAgent });
  return c.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email } } });
}
