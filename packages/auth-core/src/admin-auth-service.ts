import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getAdminPermissionsForRole } from '@haa/shared';
import { hashPassword, verifyPassword } from './password.js';
import { signAdminToken } from './admin.js';
import {
  ADMIN_TOTP_READINESS_MESSAGE,
  buildAdminTotpOtpAuthUrl,
  decryptAdminTotpSecret,
  encryptAdminTotpSecret,
  generateAdminTotpSecret,
  isAdminTotpEncryptionConfigured,
  isAdminTotpSchemaReadinessError,
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
  ready: boolean;
  readinessMessage: string | null;
}

export type AdminTotpEnrollmentStartResult =
  | { ok: true; secret: string; otpauthUrl: string; expiresAt: string }
  | { ok: false; reason: 'NOT_FOUND' | 'ENCRYPTION_NOT_CONFIGURED' | 'READINESS_UNAVAILABLE'; message: string };

export type AdminTotpMutationResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' | 'NOT_ENABLED' | 'NO_PENDING_ENROLLMENT' | 'EXPIRED' | 'INVALID_CODE' | 'READINESS_UNAVAILABLE'; message: string };

export type AdminPasswordResetRequestResult =
  | { ok: true }
  | { ok: false; reason: 'RATE_LIMITED'; message: string };

type OtpFailureReason = Extract<VerifyOtpResult, { ok: false }>['reason'];

export type AdminPasswordResetConfirmResult =
  | { ok: true }
  | { ok: false; reason: OtpFailureReason; message: string };

const TOTP_ENROLLMENT_EXPIRY_MS = 15 * 60 * 1000;
const RESET_REQUEST_UNIFORM_OK: AdminPasswordResetRequestResult = { ok: true };
const ADMIN_BASE_USER_SELECT = {
  id: s.users.id,
  name: s.users.name,
  email: s.users.email,
  passwordHash: s.users.passwordHash,
  isAdmin: s.users.isAdmin,
  isActive: s.users.isActive,
};
const ADMIN_ROLE_SELECT = {
  adminRole: s.users.adminRole,
};
const ADMIN_TOTP_LOGIN_SELECT = {
  adminTotpSecretEncrypted: s.users.adminTotpSecretEncrypted,
  adminTotpEnabledAt: s.users.adminTotpEnabledAt,
};
const ADMIN_TOTP_STATE_SELECT = {
  ...ADMIN_BASE_USER_SELECT,
  adminTotpSecretEncrypted: s.users.adminTotpSecretEncrypted,
  adminTotpPendingSecretEncrypted: s.users.adminTotpPendingSecretEncrypted,
  adminTotpPendingCreatedAt: s.users.adminTotpPendingCreatedAt,
  adminTotpEnabledAt: s.users.adminTotpEnabledAt,
};
const ADMIN_TOTP_READINESS_RESULT = {
  ok: false,
  reason: 'READINESS_UNAVAILABLE',
  message: ADMIN_TOTP_READINESS_MESSAGE,
} as const;

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
      .select(ADMIN_BASE_USER_SELECT)
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

    const totpState = await this.getLoginTotpState(user.id);
    const encryptedTotpSecret = totpState?.adminTotpEnabledAt ? totpState.adminTotpSecretEncrypted : null;
    const twoFactorEnabled = Boolean(encryptedTotpSecret);
    if (encryptedTotpSecret) {
      if (!totpCode?.trim()) {
        return {
          kind: 'two_factor_required',
          message: 'Two-factor code required',
          user: { email: user.email },
        };
      }

      let totpSecret: string;
      try {
        totpSecret = decryptAdminTotpSecret(encryptedTotpSecret);
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

    const adminRole = await this.getAdminRole(user);
    const token = signAdminToken({
      userId: user.id,
      isAdmin: true,
      // Role-scoped permissions. Legacy rows (no adminRole) fail safe to
      // super_admin → ['admin:*'] so no existing admin is locked out.
      permissions: getAdminPermissionsForRole(adminRole),
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
    let user: {
      adminTotpEnabledAt: Date | null;
      adminTotpPendingCreatedAt: Date | null;
      adminTotpPendingSecretEncrypted: string | null;
    } | undefined;
    try {
      [user] = await this.db
        .select({
          adminTotpEnabledAt: s.users.adminTotpEnabledAt,
          adminTotpPendingCreatedAt: s.users.adminTotpPendingCreatedAt,
          adminTotpPendingSecretEncrypted: s.users.adminTotpPendingSecretEncrypted,
        })
        .from(s.users)
        .where(eq(s.users.id, userId))
        .limit(1);
    } catch (error) {
      if (!isAdminTotpSchemaReadinessError(error)) throw error;
      return {
        enabled: false,
        pending: false,
        enabledAt: null,
        pendingExpiresAt: null,
        ready: false,
        readinessMessage: ADMIN_TOTP_READINESS_MESSAGE,
      };
    }

    const pendingExpiresAt = user?.adminTotpPendingCreatedAt
      ? new Date(user.adminTotpPendingCreatedAt.getTime() + TOTP_ENROLLMENT_EXPIRY_MS).toISOString()
      : null;

    return {
      enabled: Boolean(user?.adminTotpEnabledAt),
      pending: Boolean(user?.adminTotpPendingSecretEncrypted && pendingExpiresAt && new Date(pendingExpiresAt) > new Date()),
      enabledAt: user?.adminTotpEnabledAt?.toISOString() ?? null,
      pendingExpiresAt,
      ready: true,
      readinessMessage: null,
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

    try {
      await this.db
        .update(s.users)
        .set({
          adminTotpPendingSecretEncrypted: encryptAdminTotpSecret(secret),
          adminTotpPendingCreatedAt: now,
          updatedAt: now,
        })
        .where(eq(s.users.id, user.id));
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return ADMIN_TOTP_READINESS_RESULT;
      throw error;
    }

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
    let user: Awaited<ReturnType<AdminAuthService['getActiveAdminUserWithTotp']>>;
    try {
      user = await this.getActiveAdminUserWithTotp(input.userId);
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return ADMIN_TOTP_READINESS_RESULT;
      throw error;
    }
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
    try {
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
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return ADMIN_TOTP_READINESS_RESULT;
      throw error;
    }

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
    let user: Awaited<ReturnType<AdminAuthService['getActiveAdminUserWithTotp']>>;
    try {
      user = await this.getActiveAdminUserWithTotp(input.userId);
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return ADMIN_TOTP_READINESS_RESULT;
      throw error;
    }
    if (!user) return { ok: false, reason: 'NOT_FOUND', message: 'Admin user not found' };
    if (!user.adminTotpSecretEncrypted || !user.adminTotpEnabledAt) {
      return { ok: false, reason: 'NOT_ENABLED', message: 'Two-factor authentication is not enabled' };
    }

    const secret = decryptAdminTotpSecret(user.adminTotpSecretEncrypted);
    if (!verifyAdminTotpCode({ secret, code: input.code })) {
      return { ok: false, reason: 'INVALID_CODE', message: 'Invalid two-factor code' };
    }

    const now = new Date();
    try {
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
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return ADMIN_TOTP_READINESS_RESULT;
      throw error;
    }

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
      .select(ADMIN_BASE_USER_SELECT)
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
      .select(ADMIN_BASE_USER_SELECT)
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
      .select(ADMIN_BASE_USER_SELECT)
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);
    return user?.isAdmin && user.isActive ? user : null;
  }

  private async getActiveAdminUserWithTotp(userId: number) {
    const [user] = await this.db
      .select(ADMIN_TOTP_STATE_SELECT)
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);
    return user?.isAdmin && user.isActive ? user : null;
  }

  private async getLoginTotpState(userId: number) {
    try {
      const [state] = await this.db
        .select(ADMIN_TOTP_LOGIN_SELECT)
        .from(s.users)
        .where(eq(s.users.id, userId))
        .limit(1);
      return state ?? null;
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) return null;
      throw error;
    }
  }

  private async getAdminRole(user: { id: number; adminRole?: string | null }): Promise<string | null> {
    if ('adminRole' in user) return user.adminRole ?? null;
    try {
      const [roleRow] = await this.db
        .select(ADMIN_ROLE_SELECT)
        .from(s.users)
        .where(eq(s.users.id, user.id))
        .limit(1);
      return roleRow?.adminRole ?? null;
    } catch (error) {
      if (isAdminRoleSchemaReadinessError(error)) return null;
      throw error;
    }
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

function isAdminRoleSchemaReadinessError(error: unknown): boolean {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth += 1) {
    const value = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof value.code === 'string') parts.push(value.code);
    if (typeof value.message === 'string') parts.push(value.message);
    current = value.cause;
  }

  const text = parts.join(' ').toLowerCase();
  const referencesAdminRole = text.includes('admin_role') || text.includes('adminrole');
  const isMissingColumn = text.includes('42703') || text.includes('does not exist') || text.includes('no such column');
  return referencesAdminRole && isMissingColumn;
}
