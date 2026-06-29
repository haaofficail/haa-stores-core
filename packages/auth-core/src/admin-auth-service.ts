import { eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getAdminPermissionsForRole } from '@haa/shared';
import { verifyPassword, signAdminToken } from './index.js';
import { AuditLogService } from '@haa/integration-core';

/**
 * AdminAuthService — owns the admin login business logic.
 *
 * This service is the ONLY place in the project that is allowed to
 * touch the `users` table for the purpose of admin authentication.
 * Routes call into this service; the service encapsulates:
 *   1. Looking up the user by email
 *   2. Rejecting non-admin or inactive accounts
 *   3. Verifying the password
 *   4. Recording the audit log entry (success or failure)
 *   5. Minting the admin JWT with role-scoped permissions (super_admin →
 *      `admin:*`; accountant → finance-only) via getAdminPermissionsForRole
 *
 * Originally extracted from `apps/api/src/routes/admin/auth.ts` as
 * part of Quality Pass 5, Route Migration 2/24.
 *
 * Important: this service is for ADMIN authentication. It must NOT
 * be conflated with the merchant `AuthFlowService` in
 * `@haa/commerce-core`. They live in different packages and have
 * different concerns (admin user, not tenant user).
 */

export interface AdminLoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AdminLoginError = {
  kind: 'unauthorized';
  message: string;
};

export interface AdminLoginResult {
  token: string;
  user: { id: number; name: string; email: string };
}

export class AdminAuthService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

  /**
   * Authenticate an admin user. The caller is responsible for
   * mapping the `unauthorized` error kind to HTTP 401.
   *
   * The 4 failure paths:
   *   - user not found
   *   - user is not an admin
   *   - user is inactive
   *   - wrong password
   * are all collapsed into the same 401 response (and the same
   * audit action) to avoid leaking which condition failed. This
   * matches the original route's behavior exactly.
   */
  async login(input: AdminLoginInput): Promise<AdminLoginResult | AdminLoginError> {
    const { email, password, ipAddress, userAgent } = input;

    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);

    if (!user || !user.isAdmin || !user.isActive) {
      await this.audit.record({
        action: 'admin_login_failed',
        entityType: 'user',
        entityId: user?.id,
        ipAddress,
        userAgent,
      });
      return { kind: 'unauthorized', message: 'Invalid admin credentials' };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await this.audit.record({
        actorUserId: user.id,
        action: 'admin_login_failed',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
      return { kind: 'unauthorized', message: 'Invalid admin credentials' };
    }

    const token = signAdminToken({
      userId: user.id,
      isAdmin: true,
      // Role-scoped permissions. Legacy rows (no adminRole) fail safe to
      // super_admin → ['admin:*'] so no existing admin is locked out.
      permissions: getAdminPermissionsForRole(user.adminRole),
    });

    await this.audit.record({
      actorUserId: user.id,
      action: 'admin_login',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const adminAuthService = new AdminAuthService();
