import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getAdminPermissionsForRole } from '@haa/shared';
import { hashPassword, verifyPassword } from './password.js';
import { signAdminToken } from './admin.js';
import {
  buildAdminTotpOtpAuthUrl,
  decryptAdminTotpSecret,
  encryptAdminTotpSecret,
  generateAdminTotpSecret,
  isAdminTotpEncryptionConfigured,
  verifyAdminTotpCode,
} from './admin-totp.js';
import { EmailOtpService, type VerifyOtpResult } from './email-otp-service.js';
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
  totpCode?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type AdminLoginError = {
  kind: 'unauthorized';
  message: string;
};

export type AdminLoginTwoFactorRequired = {
  kind: 'two_factor_required';
  message: string;
  user: { email: string };
};

export interface AdminLoginResult {
  token: string;
  user: { id: number; name: string; email: string };
}

export interface AdminTotpStatus {
  enabled: boolean;
  pending: boolean;
  enabledAt: string | null;
  pendingExpiresAt: string | null;
}

export type AdminTotpEnrollmentStartResult =
  | { ok: true; secret: string; otpauthUrl: string; expiresAt: string }
  | { ok: false; reason: 'NOT_FOUND' | 'ENCRYPTION_NOT_CONFIGURED'; message: string };

export type AdminTotpMutationResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' | 'NOT_ENABLED' | 'NO_PENDING_ENROLLMENT' | 'EXPIRED' | 'INVALID_CODE'; message: string };

export type AdminPasswordResetRequestResult =
  | { ok: true }
  | { ok: false; reason: 'RATE_LIMITED'; message: string };

type OtpFailureReason = Extract<VerifyOtpResult, { ok: false }>['reason'];

export type AdminPasswordResetConfirmResult =
  | { ok: true }
  | { ok: false; reason: OtpFailureReason; message: string };

const TOTP_ENROLLMENT_EXPIRY_MS = 15 * 60 * 1000;
const RESET_REQUEST_UNIFORM_OK: AdminPasswordResetRequestResult = { ok: true };

export class AdminAuthService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
    private otp: EmailOtpService = new EmailOtpService(db),
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
  async login(input: AdminLoginInput): Promise<AdminLoginResult | AdminLoginError | AdminLoginTwoFactorRequired> {
    const { email, password, totpCode, ipAddress, userAgent } = input;

    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email.trim().toLowerCase()))
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

    const twoFactorEnabled = Boolean(user.adminTotpEnabledAt && user.adminTotpSecretEncrypted);
    if (twoFactorEnabled) {
      if (!totpCode?.trim()) {
        return {
          kind: 'two_factor_required',
          message: 'Two-factor code required',
          user: { email: user.email },
        };
      }

      let totpSecret: string;
      try {
        totpSecret = decryptAdminTotpSecret(user.adminTotpSecretEncrypted as string);
      } catch {
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

      if (!verifyAdminTotpCode({ secret: totpSecret, code: totpCode })) {
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
    }

    const token = signAdminToken({
      userId: user.id,
      isAdmin: true,
      // Role-scoped permissions. Legacy rows (no adminRole) fail safe to
      // super_admin → ['admin:*'] so no existing admin is locked out.
      permissions: getAdminPermissionsForRole(user.adminRole),
      twoFactorEnabled,
      twoFactorVerified: twoFactorEnabled,
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

  async getTotpStatus(userId: number): Promise<AdminTotpStatus> {
    const [user] = await this.db
      .select({
        adminTotpEnabledAt: s.users.adminTotpEnabledAt,
        adminTotpPendingCreatedAt: s.users.adminTotpPendingCreatedAt,
        adminTotpPendingSecretEncrypted: s.users.adminTotpPendingSecretEncrypted,
      })
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);

    const pendingExpiresAt = user?.adminTotpPendingCreatedAt
      ? new Date(user.adminTotpPendingCreatedAt.getTime() + TOTP_ENROLLMENT_EXPIRY_MS).toISOString()
      : null;

    return {
      enabled: Boolean(user?.adminTotpEnabledAt),
      pending: Boolean(user?.adminTotpPendingSecretEncrypted && pendingExpiresAt && new Date(pendingExpiresAt) > new Date()),
      enabledAt: user?.adminTotpEnabledAt?.toISOString() ?? null,
      pendingExpiresAt,
    };
  }

  async startTotpEnrollment(input: {
    userId: number;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminTotpEnrollmentStartResult> {
    const user = await this.getActiveAdminUser(input.userId);
    if (!user) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Admin user not found' };
    }
    if (!isAdminTotpEncryptionConfigured()) {
      return {
        ok: false,
        reason: 'ENCRYPTION_NOT_CONFIGURED',
        message: 'Admin TOTP encryption is not configured',
      };
    }

    const secret = generateAdminTotpSecret();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOTP_ENROLLMENT_EXPIRY_MS);

    await this.db
      .update(s.users)
      .set({
        adminTotpPendingSecretEncrypted: encryptAdminTotpSecret(secret),
        adminTotpPendingCreatedAt: now,
        updatedAt: now,
      })
      .where(eq(s.users.id, user.id));

    await this.audit.record({
      actorUserId: user.id,
      action: 'admin_totp_enrollment_started',
      entityType: 'user',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return {
      ok: true,
      secret,
      otpauthUrl: buildAdminTotpOtpAuthUrl({ email: user.email, secret }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmTotpEnrollment(input: {
    userId: number;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminTotpMutationResult> {
    const user = await this.getActiveAdminUser(input.userId);
    if (!user) return { ok: false, reason: 'NOT_FOUND', message: 'Admin user not found' };
    if (!user.adminTotpPendingSecretEncrypted || !user.adminTotpPendingCreatedAt) {
      return { ok: false, reason: 'NO_PENDING_ENROLLMENT', message: 'No pending TOTP enrollment' };
    }
    if (Date.now() - user.adminTotpPendingCreatedAt.getTime() > TOTP_ENROLLMENT_EXPIRY_MS) {
      return { ok: false, reason: 'EXPIRED', message: 'TOTP enrollment expired' };
    }

    const secret = decryptAdminTotpSecret(user.adminTotpPendingSecretEncrypted);
    if (!verifyAdminTotpCode({ secret, code: input.code })) {
      return { ok: false, reason: 'INVALID_CODE', message: 'Invalid two-factor code' };
    }

    const now = new Date();
    await this.db
      .update(s.users)
      .set({
        adminTotpSecretEncrypted: user.adminTotpPendingSecretEncrypted,
        adminTotpPendingSecretEncrypted: null,
        adminTotpPendingCreatedAt: null,
        adminTotpEnabledAt: now,
        updatedAt: now,
      })
      .where(eq(s.users.id, user.id));

    await this.audit.record({
      actorUserId: user.id,
      action: 'admin_totp_enabled',
      entityType: 'user',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { ok: true };
  }

  async disableTotp(input: {
    userId: number;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminTotpMutationResult> {
    const user = await this.getActiveAdminUser(input.userId);
    if (!user) return { ok: false, reason: 'NOT_FOUND', message: 'Admin user not found' };
    if (!user.adminTotpSecretEncrypted || !user.adminTotpEnabledAt) {
      return { ok: false, reason: 'NOT_ENABLED', message: 'Two-factor authentication is not enabled' };
    }

    const secret = decryptAdminTotpSecret(user.adminTotpSecretEncrypted);
    if (!verifyAdminTotpCode({ secret, code: input.code })) {
      return { ok: false, reason: 'INVALID_CODE', message: 'Invalid two-factor code' };
    }

    const now = new Date();
    await this.db
      .update(s.users)
      .set({
        adminTotpSecretEncrypted: null,
        adminTotpPendingSecretEncrypted: null,
        adminTotpPendingCreatedAt: null,
        adminTotpEnabledAt: null,
        updatedAt: now,
      })
      .where(eq(s.users.id, user.id));

    await this.audit.record({
      actorUserId: user.id,
      action: 'admin_totp_disabled',
      entityType: 'user',
      entityId: user.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { ok: true };
  }

  async requestPasswordReset(input: {
    email: string;
    sourceIp?: string | null;
    userAgent?: string | null;
  }): Promise<AdminPasswordResetRequestResult> {
    const email = input.email.trim().toLowerCase();
    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);

    if (!user || !user.isAdmin || !user.isActive) {
      return RESET_REQUEST_UNIFORM_OK;
    }

    const result = await this.otp.generateAndSend({
      email,
      purpose: 'password_reset',
      userId: user.id,
      sourceIp: input.sourceIp,
      userAgent: input.userAgent,
    });

    if (!result.ok && result.reason === 'RATE_LIMITED') {
      return { ok: false, reason: 'RATE_LIMITED', message: result.message ?? 'Rate limited' };
    }
    if (result.ok) {
      await this.audit.record({
        actorUserId: user.id,
        action: 'admin_password_reset_requested',
        entityType: 'user',
        entityId: user.id,
        ipAddress: input.sourceIp,
        userAgent: input.userAgent,
      });
    }

    return RESET_REQUEST_UNIFORM_OK;
  }

  async confirmPasswordReset(input: {
    email: string;
    code: string;
    newPassword: string;
    sourceIp?: string | null;
    userAgent?: string | null;
  }): Promise<AdminPasswordResetConfirmResult> {
    const email = input.email.trim().toLowerCase();
    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, email))
      .limit(1);
    if (!user || !user.isAdmin || !user.isActive) {
      return { ok: false, reason: 'NOT_FOUND', message: 'Invalid or expired reset code' };
    }

    const verified = await this.otp.verify({
      email,
      purpose: 'password_reset',
      code: input.code,
    });
    if (!verified.ok) {
      return { ok: false, reason: verified.reason, message: messageForOtpFailure(verified.reason) };
    }
    if (verified.userId !== null && verified.userId !== user.id) {
      return { ok: false, reason: 'INVALID_CODE', message: 'Invalid reset code' };
    }

    await this.db
      .update(s.users)
      .set({
        passwordHash: await hashPassword(input.newPassword),
        tokenVersion: sql`${s.users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(s.users.id, user.id));

    await this.audit.record({
      actorUserId: user.id,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: user.id,
      ipAddress: input.sourceIp,
      userAgent: input.userAgent,
    });

    return { ok: true };
  }

  private async getActiveAdminUser(userId: number) {
    const [user] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);
    return user?.isAdmin && user.isActive ? user : null;
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const adminAuthService = new AdminAuthService();

function messageForOtpFailure(reason: OtpFailureReason): string {
  switch (reason) {
    case 'EXPIRED':
      return 'Reset code expired';
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many attempts';
    case 'USED':
      return 'Reset code already used';
    case 'INVALID_CODE':
    case 'NOT_FOUND':
      return 'Invalid or expired reset code';
  }
}
